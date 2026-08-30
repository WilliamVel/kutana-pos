import {
  createPaymentMethodRegistry,
  type PaymentMethodCode,
  type PaymentMethodRegistry,
} from "./payment-method-registry.js";

/**
 * v1 seed data for the payment method registry. This is the ONLY place in
 * `packages/shared` allowed to reference concrete method codes as literals
 * (CASH, BANK_TRANSFER, QR_PAYMENT) — see
 * `src/__tests__/no-hardcoded-payment-method.guard.test.ts`, which statically
 * scans every other source file to enforce that domain logic never branches
 * on a literal method code.
 *
 * QR_PAYMENT is modeled as its own method, distinct from BANK_TRANSFER, per
 * the confirmed design decision — merging them later is cheap; un-merging a
 * merged method is not.
 */
export const KUTANA_V1_PAYMENT_METHODS: PaymentMethodRegistry = createPaymentMethodRegistry([
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
