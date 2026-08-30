import { describe, expect, it } from "vitest";
import type { PaymentMethodCode } from "../../model/payment-method-registry.js";
import type { PaymentRepository } from "../payment-repository.js";

/**
 * A fixture-only payment method code. Deliberately NOT a real v1 method
 * literal (see `payment-method-registry.seed.ts`) — this contract suite
 * only needs *a* method code to attach to a `Payment`, and using a fixture
 * value keeps this file out of the no-hardcoded-payment-method guard scan.
 */
const FIXTURE_METHOD = "FIXTURE_METHOD" as PaymentMethodCode;

/**
 * Implementation-agnostic conformance suite for `PaymentRepository`.
 * Payments are append-only — there is no version/conflict contract here,
 * only the accumulate-and-list contract described in the port.
 */
export function runPaymentRepositoryContract(
  createRepository: () => PaymentRepository | Promise<PaymentRepository>,
): void {
  describe("PaymentRepository contract", () => {
    it("returns an empty list from listByTicket when no payments were recorded", async () => {
      const repository = await createRepository();
      const payments = await repository.listByTicket("ticket-does-not-exist");
      expect(payments).toEqual([]);
    });

    it("records a payment and reads it back via listByTicket", async () => {
      const repository = await createRepository();
      const recorded = await repository.record({
        id: "payment-1",
        ticketId: "ticket-1",
        methodCode: FIXTURE_METHOD,
        amountCents: 1000,
        tenderedCents: 1000,
        changeCents: 0,
        recordedAt: new Date().toISOString(),
      });

      expect(recorded.ticketId).toBe("ticket-1");

      const payments = await repository.listByTicket("ticket-1");
      expect(payments).toHaveLength(1);
      expect(payments[0]?.amountCents).toBe(1000);
    });

    it("accumulates multiple partial payments against the same ticket", async () => {
      const repository = await createRepository();
      await repository.record({
        id: "payment-2",
        ticketId: "ticket-2",
        methodCode: FIXTURE_METHOD,
        amountCents: 1000,
        tenderedCents: 1000,
        changeCents: 0,
        recordedAt: new Date().toISOString(),
      });
      await repository.record({
        id: "payment-3",
        ticketId: "ticket-2",
        methodCode: FIXTURE_METHOD,
        amountCents: 500,
        tenderedCents: 500,
        changeCents: 0,
        recordedAt: new Date().toISOString(),
      });

      const payments = await repository.listByTicket("ticket-2");
      const total = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
      expect(payments).toHaveLength(2);
      expect(total).toBe(1500);
    });

    it("never returns payments recorded against a different ticket", async () => {
      const repository = await createRepository();
      await repository.record({
        id: "payment-4",
        ticketId: "ticket-a",
        methodCode: FIXTURE_METHOD,
        amountCents: 100,
        tenderedCents: 100,
        changeCents: 0,
        recordedAt: new Date().toISOString(),
      });

      const payments = await repository.listByTicket("ticket-b");
      expect(payments).toEqual([]);
    });
  });
}
