import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import type {
  CustomerDebtDirection,
  CustomerDebtEntry,
  CustomerDebtEntryKind,
} from "@kutana/shared/billing/model/customer-debt-ledger.js";
import type { CustomerDebtRepository } from "@kutana/shared/billing/ports/customer-debt-repository.js";
import { PostgresPool } from "../../../infrastructure/postgres/postgres-pool.js";

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
