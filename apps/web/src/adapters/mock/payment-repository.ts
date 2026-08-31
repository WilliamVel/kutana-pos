import type { Payment, PaymentTarget } from "@kutana/shared/payments/model/payment.js";
import type { PaymentRepository } from "@kutana/shared/payments/ports/payment-repository.js";
import { simulateLatency } from "./simulate-latency.js";

/**
 * In-memory `PaymentRepository` for milestone 1. Payments are append-only
 * (see design.md), so unlike the other mock repositories this one carries
 * no `ConflictTrigger` — there is no version-based write to conflict on.
 */
export class MockPaymentRepository implements PaymentRepository {
  private readonly paymentsByTarget = new Map<string, Payment[]>();

  async listByTarget(target: PaymentTarget): Promise<Payment[]> {
    return simulateLatency(() => [...(this.paymentsByTarget.get(paymentTargetKey(target)) ?? [])]);
  }

  async listByTicket(ticketId: string): Promise<Payment[]> {
    return this.listByTarget({ kind: "ticket", ticketId });
  }

  async record(payment: Payment): Promise<Payment> {
    return simulateLatency(() => {
      const key = paymentTargetKey(payment.target);
      const existing = this.paymentsByTarget.get(key) ?? [];
      this.paymentsByTarget.set(key, [...existing, payment]);
      return payment;
    });
  }
}

function paymentTargetKey(target: PaymentTarget): string {
  switch (target.kind) {
    case "personal_account":
      return `personal_account:${target.accountId}`;
    case "customer_debt":
      return `customer_debt:${target.customerId}`;
    case "ticket":
      return `ticket:${target.ticketId}`;
  }
}
