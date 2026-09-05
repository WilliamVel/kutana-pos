import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
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
    const [accountId, customerId, ticketId] = targetReference(payment.target);
    const result = await this.pool.query<PaymentRow>(
      `INSERT INTO payments
         (id, account_id, customer_id, ticket_id, method_code, amount_cents, tendered_cents, change_cents, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${paymentColumns}`,
      [
        payment.id,
        accountId,
        customerId,
        ticketId,
        payment.methodCode,
        payment.amountCents,
        payment.tenderedCents,
        payment.changeCents,
        payment.recordedAt,
      ],
    );
    return mapPayment(result.rows[0]!);
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
