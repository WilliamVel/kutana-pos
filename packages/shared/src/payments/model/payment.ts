import type { PaymentMethodCode } from "./payment-method-registry.js";

/**
 * A Payment is append-only: a Ticket MAY accumulate multiple payments until
 * its total is covered. Payments are never edited or deleted, only added.
 */
export interface Payment {
  readonly id: string;
  readonly ticketId: string;
  readonly methodCode: PaymentMethodCode;
  readonly amountCents: number;
  readonly tenderedCents: number | null;
  readonly changeCents: number | null;
  readonly recordedAt: string;
}
