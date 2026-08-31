import type { PaymentMethodCode } from "./payment-method-registry.js";

export type PaymentTarget =
  | { readonly kind: "personal_account"; readonly accountId: string }
  | { readonly kind: "customer_debt"; readonly customerId: string }
  | { readonly kind: "ticket"; readonly ticketId: string };

/**
 * A Payment is append-only: a payable target MAY accumulate multiple payments
 * until its balance is covered. `ticketId` remains only as a milestone-1
 * compatibility field while UI slices migrate to explicit payment targets.
 */
export interface Payment {
  readonly id: string;
  readonly target: PaymentTarget;
  /** @deprecated Use `target` instead. Kept temporarily for milestone-1 ticket compatibility. */
  readonly ticketId?: string;
  readonly methodCode: PaymentMethodCode;
  readonly amountCents: number;
  readonly tenderedCents: number | null;
  readonly changeCents: number | null;
  readonly recordedAt: string;
}
