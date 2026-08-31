import type { Payment, PaymentTarget } from "../model/payment.js";

/**
 * Port contract only — implementations live in adapters (mock/HTTP/Postgres).
 * Payments are append-only: there is no update or delete path, and therefore
 * no optimistic-concurrency version is needed on this port.
 * Explicit targets let new personal-account and customer-debt flows record
 * payments without depending on milestone-1 ticket terminology.
 */
export interface PaymentRepository {
  listByTarget(target: PaymentTarget): Promise<Payment[]>;
  /** @deprecated Use `listByTarget({ kind: "ticket", ticketId })` during the migration. */
  listByTicket(ticketId: string): Promise<Payment[]>;
  /** Records a new append-only Payment against an explicit payable target. */
  record(payment: Payment): Promise<Payment>;
}
