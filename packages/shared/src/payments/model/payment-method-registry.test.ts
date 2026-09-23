import { describe, expect, it } from "vitest";
import {
  createPaymentMethodRegistry,
  isPaymentMethodDisplayable,
  requiresTendered,
  type PaymentMethodCode,
} from "./payment-method-registry.js";

/**
 * Payment methods are DATA, not code: the only behavioral variance is
 * whether a method requires a tendered amount (to compute change). CASH
 * requires it; BANK_TRANSFER and QR_PAYMENT do not. This registry is the
 * seam that lets a new method be added as one row, zero domain edits.
 */
describe("PaymentMethodRegistry", () => {
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

  it("reports CASH requires a tendered amount", () => {
    expect(requiresTendered(registry, "CASH" as PaymentMethodCode)).toBe(true);
  });

  it("reports BANK_TRANSFER does not require a tendered amount", () => {
    expect(requiresTendered(registry, "BANK_TRANSFER" as PaymentMethodCode)).toBe(false);
  });

  it("reports QR_PAYMENT does not require a tendered amount, and is distinct from BANK_TRANSFER", () => {
    expect(requiresTendered(registry, "QR_PAYMENT" as PaymentMethodCode)).toBe(false);
    expect(registry.find((entry) => entry.code === "QR_PAYMENT")).toBeDefined();
    expect(registry.find((entry) => entry.code === "BANK_TRANSFER")).toBeDefined();
    expect(registry.find((entry) => entry.code === "QR_PAYMENT")).not.toBe(
      registry.find((entry) => entry.code === "BANK_TRANSFER"),
    );
  });

  it("does not expose inactive or test/fixture methods to the cashier", () => {
    expect(
      isPaymentMethodDisplayable({
        ...registry[0]!,
        code: "FIXTURE_METHOD" as PaymentMethodCode,
        label: "Fixture Method",
      }),
    ).toBe(false);
    expect(isPaymentMethodDisplayable({ ...registry[0]!, active: false })).toBe(false);
    expect(isPaymentMethodDisplayable(registry[0]!)).toBe(true);
  });

  it("throws when asking about an unregistered method code", () => {
    expect(() => requiresTendered(registry, "CREDIT_NOTE" as PaymentMethodCode)).toThrow();
  });

  it("adding a new method is one registry row: extending the registry does not require touching this behavior function", () => {
    const extended = createPaymentMethodRegistry([
      ...registry,
      {
        code: "CREDIT_NOTE" as PaymentMethodCode,
        label: "Credit Note",
        requiresTendered: false,
        active: true,
        sortOrder: 4,
      },
    ]);
    expect(requiresTendered(extended, "CREDIT_NOTE" as PaymentMethodCode)).toBe(false);
  });
});
