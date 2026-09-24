import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { Pool, PoolClient } from "pg";
import type { Payment, PaymentTarget } from "@kutana/shared/payments/model/payment.js";
import type { PaymentRepository } from "@kutana/shared/payments/ports/payment-repository.js";
import { PostgresPool } from "../../../infrastructure/postgres/postgres-pool.js";

interface PaymentRow {
  id: string;
  account_id: string | null;
  customer_id: string | null;
  ticket_id: string | null;
  method_code: Payment["methodCode"];
  amount_cents: number;
  tendered_cents: number | null;
  change_cents: number | null;
  recorded_at: Date | string;
}

const paymentColumns =
  "id, account_id, customer_id, ticket_id, method_code, amount_cents, tendered_cents, change_cents, recorded_at";

const iso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const mapTarget = (row: PaymentRow): PaymentTarget => {
  if (row.account_id !== null) return { kind: "personal_account", accountId: row.account_id };
  if (row.customer_id !== null) return { kind: "customer_debt", customerId: row.customer_id };
  if (row.ticket_id !== null) return { kind: "ticket", ticketId: row.ticket_id };
  throw new Error(`Payment ${row.id} has no target reference`);
};

const mapPayment = (row: PaymentRow): Payment => {
  const target = mapTarget(row);
  return {
    id: row.id,
    target,
    ...(target.kind === "ticket" ? { ticketId: target.ticketId } : {}),
    methodCode: row.method_code,
    amountCents: row.amount_cents,
    tenderedCents: row.tendered_cents,
    changeCents: row.change_cents,
    recordedAt: iso(row.recorded_at),
  };
};

async function assertTargetBalance(client: PoolClient, payment: Payment): Promise<void> {
  if (payment.target.kind === "ticket") return;
  if (!Number.isInteger(payment.amountCents) || payment.amountCents <= 0) throw new BadRequestException("Payment amount must be positive cents");
  if (payment.target.kind === "customer_debt") {
    await client.query("SELECT id FROM customers WHERE id = $1 FOR UPDATE", [payment.target.customerId]);
    const result = await client.query<{ balance_cents: number }>(
      `SELECT COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount_cents ELSE -amount_cents END), 0)::integer AS balance_cents
       FROM customer_debt_ledger WHERE customer_id = $1`, [payment.target.customerId]);
    if (payment.amountCents > (result.rows[0]?.balance_cents ?? 0)) throw new BadRequestException("Payment amount exceeds the outstanding balance");
    return;
  }
  await client.query("SELECT id FROM personal_accounts WHERE id = $1 FOR UPDATE", [payment.target.accountId]);
  const result = await client.query<{ balance_cents: number }>(
    `WITH total AS (
       SELECT COALESCE(SUM(ROUND(li.total_cents::numeric / li.quantity * ala.quantity)), 0)::integer AS total_cents
       FROM account_line_allocations ala JOIN line_items li ON li.id = ala.line_item_id
       WHERE ala.account_id = $1
     ), paid AS (
       SELECT COALESCE(SUM(amount_cents), 0)::integer AS paid_cents FROM payments WHERE account_id = $1
     ) SELECT total.total_cents - paid.paid_cents AS balance_cents FROM total, paid`, [payment.target.accountId]);
  if (payment.amountCents > Math.max(0, result.rows[0]?.balance_cents ?? 0)) throw new BadRequestException("Payment amount exceeds the outstanding balance");
}

const targetReference = (target: PaymentTarget): [string | null, string | null, string | null] => {
  switch (target.kind) {
    case "personal_account":
      return [target.accountId, null, null];
    case "customer_debt":
      return [null, target.customerId, null];
    case "ticket":
      return [null, null, target.ticketId];
  }
};

const targetWhere = (target: PaymentTarget): [string, string] => {
  switch (target.kind) {
    case "personal_account":
      return ["account_id", target.accountId];
    case "customer_debt":
      return ["customer_id", target.customerId];
    case "ticket":
      return ["ticket_id", target.ticketId];
  }
};

@Injectable()
export class PostgresPaymentRepository implements PaymentRepository {
  constructor(@Inject(PostgresPool) private readonly pool: Pool) {}

  async record(payment: Payment): Promise<Payment> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await assertTargetBalance(client, payment);
      const [accountId, customerId, ticketId] = targetReference(payment.target);
      const result = await client.query<PaymentRow>(
        `INSERT INTO payments
           (id, account_id, customer_id, ticket_id, method_code, amount_cents, tendered_cents, change_cents, recorded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING ${paymentColumns}`,
        [payment.id, accountId, customerId, ticketId, payment.methodCode, payment.amountCents, payment.tenderedCents, payment.changeCents, payment.recordedAt],
      );
      await client.query("COMMIT");
      return mapPayment(result.rows[0]!);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listByTarget(target: PaymentTarget): Promise<Payment[]> {
    const [column, value] = targetWhere(target);
    const result = await this.pool.query<PaymentRow>(
      `SELECT ${paymentColumns}
       FROM payments
       WHERE ${column} = $1
       ORDER BY recorded_at, id`,
      [value],
    );
    return result.rows.map(mapPayment);
  }

  async listByTicket(ticketId: string): Promise<Payment[]> {
    return this.listByTarget({ kind: "ticket", ticketId });
  }
}
