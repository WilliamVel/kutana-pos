import type { Payment } from "../model/payment.js";

/**
 * Port contract only — implementations live in adapters (mock/HTTP/Postgres).
 * Payments are append-only: there is no update or delete path, and therefore
 * no optimistic-concurrency version is needed on this port.
 *
 * NOTE: this port was not enumerated in task 6.5's port list (an oversight
 * in the original task breakdown) but is required to build
 * `MockPaymentRepository` in Phase 8 and is added here as a necessary
 * prerequisite, following the same shape as the sibling ports.
 */
export interface PaymentRepository {
  listByTicket(ticketId: string): Promise<Payment[]>;
  /** Records a new append-only Payment against a ticket. */
  record(payment: Payment): Promise<Payment>;
}
