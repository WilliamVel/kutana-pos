import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import type {
  CustomerDebtDirection,
  CustomerDebtEntry,
  CustomerDebtEntryKind,
} from "@kutana/shared/billing/model/customer-debt-ledger.js";
import type { PendingDebtPage, PendingDebtPageQuery } from "@kutana/shared/billing/model/pending-debt-page.js";
import type { CustomerDebtRepository } from "@kutana/shared/billing/ports/customer-debt-repository.js";
import { PostgresPool } from "../../../infrastructure/postgres/postgres-pool.js";

interface CustomerDebtSummaryRow {
  customer_id: string;
  display_name: string;
  balance_cents: number;
  last_debt_at: Date | string;
  debit_cents: number;
  paid_cents: number;
  source_count: number;
}

interface CustomerDebtRow {
  id: string;
  customer_id: string;
  kind: CustomerDebtEntryKind;
  direction: CustomerDebtDirection;
  amount_cents: number;
  account_id: string | null;
  payment_id: string | null;
  note: string | null;
  created_at: Date | string;
}

const debtColumns = "id, customer_id, kind, direction, amount_cents, account_id, payment_id, note, created_at";

const iso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const mapDebtEntry = (row: CustomerDebtRow): CustomerDebtEntry => ({
  id: row.id,
  customerId: row.customer_id,
  kind: row.kind,
  direction: row.direction,
  amountCents: row.amount_cents,
  accountId: row.account_id,
  paymentId: row.payment_id,
  note: row.note,
  createdAt: iso(row.created_at),
});

@Injectable()
export class PostgresCustomerDebtRepository implements CustomerDebtRepository {
  constructor(@Inject(PostgresPool) private readonly pool: Pool) {}

  async listByCustomer(customerId: string): Promise<CustomerDebtEntry[]> {
    const result = await this.pool.query<CustomerDebtRow>(
      `SELECT ${debtColumns}
       FROM customer_debt_ledger
       WHERE customer_id = $1
       ORDER BY created_at, id`,
      [customerId],
    );
    return result.rows.map(mapDebtEntry);
  }

  async listAll(): Promise<CustomerDebtEntry[]> {
    const result = await this.pool.query<CustomerDebtRow>(
      `SELECT ${debtColumns}
       FROM customer_debt_ledger
       ORDER BY created_at, id`,
    );
    return result.rows.map(mapDebtEntry);
  }

  async listPendingPage(query: PendingDebtPageQuery): Promise<PendingDebtPage> {
    const page = Math.max(0, Math.floor(query.page));
    const pageSize = Math.min(100, Math.max(1, Math.floor(query.pageSize)));
    const search = query.search?.trim() ?? "";
    const order = query.sort === "balance"
      ? "balance_cents DESC, customer_id ASC"
      : "last_debt_at DESC, customer_id ASC";
    const rows = await this.pool.query<CustomerDebtSummaryRow>(
      `WITH balances AS (
         SELECT c.id AS customer_id, c.display_name,
                COALESCE(SUM(CASE WHEN d.direction = 'debit' THEN d.amount_cents ELSE -d.amount_cents END), 0)::integer AS balance_cents,
                MAX(d.created_at) AS last_debt_at,
                COALESCE(SUM(CASE WHEN d.direction = 'debit' THEN d.amount_cents ELSE 0 END), 0)::integer AS debit_cents,
                COALESCE(SUM(CASE WHEN d.direction = 'credit' THEN d.amount_cents ELSE 0 END), 0)::integer AS paid_cents,
                COUNT(DISTINCT d.account_id) FILTER (WHERE d.account_id IS NOT NULL)::integer AS source_count
         FROM customers c JOIN customer_debt_ledger d ON d.customer_id = c.id
         WHERE ($1 = '' OR lower(c.display_name) LIKE '%' || lower($1) || '%')
         GROUP BY c.id, c.display_name
       )
       SELECT customer_id, display_name, balance_cents, last_debt_at, debit_cents, paid_cents, source_count
       FROM balances
       WHERE balance_cents > 0
       ORDER BY ${order}
       LIMIT $2 OFFSET $3`,
      [search, pageSize, page * pageSize],
    );
    const count = await this.pool.query<{ total_rows: number; identified_total_cents: number }>(
      `SELECT COUNT(*)::integer AS total_rows,
              COALESCE(SUM(balance_cents), 0)::integer AS identified_total_cents
       FROM (
         SELECT c.id, SUM(CASE WHEN d.direction = 'debit' THEN d.amount_cents ELSE -d.amount_cents END) AS balance_cents
         FROM customers c JOIN customer_debt_ledger d ON d.customer_id = c.id
         WHERE ($1 = '' OR lower(c.display_name) LIKE '%' || lower($1) || '%')
         GROUP BY c.id
         HAVING SUM(CASE WHEN d.direction = 'debit' THEN d.amount_cents ELSE -d.amount_cents END) > 0
       ) balances`,
      [search],
    );
    const global = await this.pool.query<{ identified_total_cents: number; unlinked_total_cents: number }>(
      `WITH identified AS (
         SELECT COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount_cents ELSE -amount_cents END), 0)::integer AS total
         FROM customer_debt_ledger
       ), account_totals AS (
         SELECT pa.id,
                COALESCE(SUM(ROUND(li.total_cents::numeric / li.quantity * ala.quantity)), 0)::integer AS total,
                COALESCE((SELECT SUM(p.amount_cents) FROM payments p WHERE p.account_id = pa.id), 0)::integer AS paid
         FROM personal_accounts pa
         JOIN account_line_allocations ala ON ala.account_id = pa.id
         JOIN line_items li ON li.id = ala.line_item_id
         WHERE pa.status = 'pending' AND pa.customer_id IS NULL
         GROUP BY pa.id
       )
       SELECT (SELECT total FROM identified) AS identified_total_cents,
              COALESCE(SUM(GREATEST(total - paid, 0)), 0)::integer AS unlinked_total_cents
       FROM account_totals`,
    );
    const identified = global.rows[0]?.identified_total_cents ?? 0;
    const unlinked = global.rows[0]?.unlinked_total_cents ?? 0;
    return {
      rows: rows.rows.map((row) => ({ customerId: row.customer_id, displayName: row.display_name, balanceCents: row.balance_cents, lastDebtAt: iso(row.last_debt_at), debitCents: row.debit_cents, paidCents: row.paid_cents, sourceCount: row.source_count })),
      page, pageSize, totalRows: count.rows[0]?.total_rows ?? 0,
      totalPendingCents: identified + unlinked, identifiedTotalCents: identified, unlinkedTotalCents: unlinked,
    };
  }

  async record(entry: CustomerDebtEntry): Promise<CustomerDebtEntry> {
    const result = await this.pool.query<CustomerDebtRow>(
      `INSERT INTO customer_debt_ledger
         (id, customer_id, kind, direction, amount_cents, account_id, payment_id, note, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${debtColumns}`,
      [
        entry.id,
        entry.customerId,
        entry.kind,
        entry.direction,
        entry.amountCents,
        entry.accountId,
        entry.paymentId,
        entry.note,
        entry.createdAt,
      ],
    );
    return mapDebtEntry(result.rows[0]!);
  }
}
