import type { Payment } from "@kutana/shared/payments/model/payment.js";
import type { PaymentRepository } from "@kutana/shared/payments/ports/payment-repository.js";
import { simulateLatency } from "./simulate-latency.js";

/**
 * In-memory `PaymentRepository` for milestone 1. Payments are append-only
 * (see design.md), so unlike the other mock repositories this one carries
 * no `ConflictTrigger` — there is no version-based write to conflict on.
 */
export class MockPaymentRepository implements PaymentRepository {
  private readonly paymentsByTicket = new Map<string, Payment[]>();

  async listByTicket(ticketId: string): Promise<Payment[]> {
    return simulateLatency(() => [...(this.paymentsByTicket.get(ticketId) ?? [])]);
  }

  async record(payment: Payment): Promise<Payment> {
    return simulateLatency(() => {
      const existing = this.paymentsByTicket.get(payment.ticketId) ?? [];
      this.paymentsByTicket.set(payment.ticketId, [...existing, payment]);
      return payment;
    });
  }
}
