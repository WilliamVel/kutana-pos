import { describe, expect, it } from "vitest";
import { applyPayment, computeChange, paymentsTotal } from "./apply-payment.js";
import {
  createPaymentMethodRegistry,
  type PaymentMethodCode,
} from "../model/payment-method-registry.js";

const registry = createPaymentMethodRegistry([
  {
    code: "CASH" as PaymentMethodCode,
    label: "Cash",
    requiresTendered: true,
    active: true,
    sortOrder: 1,
  },
  {
    code: "BANK_TRANSFER" as PaymentMethodCode,
    label: "Bank Transfer",
    requiresTendered: false,
    active: true,
    sortOrder: 2,
  },
  {
    code: "QR_PAYMENT" as PaymentMethodCode,
    label: "QR Payment",
    requiresTendered: false,
    active: true,
    sortOrder: 3,
  },
]);

const CASH = "CASH" as PaymentMethodCode;
const QR_PAYMENT = "QR_PAYMENT" as PaymentMethodCode;

describe("applyPayment", () => {
  it("records a partial payment without covering the ticket", () => {
    const payments = applyPayment(registry, [], {
      ticketId: "t1",
      methodCode: CASH,
      amountCents: 1000,
    });
    expect(payments).toHaveLength(1);
    expect(paymentsTotal(payments)).toBe(1000);
  });

  it("covers a 1500 ticket with two partial payments: CASH 1000 then QR_PAYMENT 500", () => {
    let payments = applyPayment(registry, [], {
      ticketId: "t1",
      methodCode: CASH,
      amountCents: 1000,
    });
    payments = applyPayment(registry, payments, {
      ticketId: "t1",
      methodCode: QR_PAYMENT,
      amountCents: 500,
    });

    expect(paymentsTotal(payments)).toBe(1500);
    const remaining = 1500 - paymentsTotal(payments);
    expect(remaining).toBe(0);
  });

  it("rejects a CASH payment without a tendered amount required to compute change if overpaying", () => {
    expect(() =>
      applyPayment(registry, [], {
        ticketId: "t1",
        methodCode: CASH,
        amountCents: 800,
        tenderedCents: 500,
      }),
    ).toThrow();
  });

  it("BANK_TRANSFER and QR_PAYMENT never compute change even if a tendered amount is mistakenly supplied", () => {
    const [payment] = applyPayment(registry, [], {
      ticketId: "t1",
      methodCode: QR_PAYMENT,
      amountCents: 500,
    });
    expect(payment?.changeCents).toBeNull();
    expect(payment?.tenderedCents).toBeNull();
  });
});

describe("computeChange", () => {
  it("computes change due 200 when tendered 1000 covers a remaining balance of 800", () => {
    const result = computeChange({ remainingCents: 800, tenderedCents: 1000 });
    expect(result.amountAppliedCents).toBe(800);
    expect(result.changeCents).toBe(200);
  });

  it("computes zero change when tendered exactly matches the remaining balance", () => {
    const result = computeChange({ remainingCents: 800, tenderedCents: 800 });
    expect(result.changeCents).toBe(0);
    expect(result.amountAppliedCents).toBe(800);
  });

  it("rejects a tendered amount smaller than the remaining balance", () => {
    expect(() => computeChange({ remainingCents: 800, tenderedCents: 500 })).toThrow();
  });
});
