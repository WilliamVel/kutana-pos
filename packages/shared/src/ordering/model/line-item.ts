import { createUuid } from "../../platform/uuid.js";
/**
 * A LineItem belongs to an Order and is IMMUTABLE once created. Corrections
 * are appended as new adjustment lines (`isAdjustment: true`), never edited
 * in place.
 *
 * LineItem intentionally has NO `ticketId` field, and never will. Payment
 * responsibility is tracked exclusively through the `Allocation` model
 * (`billing/model/allocation.ts`), which maps `lineItemId -> ticketId`.
 * This indirection is the entire seam that allows a line item to move
 * between tickets (a "split") without ever mutating the Order, and is the
 * seam that will allow fractional/shared-item splitting in a future
 * version without touching this type. A future contributor "simplifying"
 * this by adding a ticketId directly here would silently destroy that
 * seam — see `line-item.test.ts` for the regression guard.
 */
export interface LineItem {
  readonly id: string;
  readonly orderId: string;
  readonly productId: string;
  readonly nameSnapshot: string;
  readonly unitPriceCents: number;
  readonly quantity: number;
  readonly pourSizeMl: number | null;
  readonly taxRateBp: number;
  readonly taxCents: number;
  readonly totalCents: number;
  readonly isAdjustment: boolean;
  readonly createdAt: string;
  /** Stable display order within the owning order. Legacy callers may omit it. */
  readonly position?: number;
}

export function createLineItem(input: {
  orderId: string;
  productId: string;
  nameSnapshot: string;
  unitPriceCents: number;
  quantity: number;
  taxRateBp: number;
  pourSizeMl?: number | null;
  isAdjustment?: boolean;
  id?: string;
  createdAt?: string;
  position?: number;
}): LineItem {
  const subtotalCents = input.unitPriceCents * input.quantity;
  const taxCents = Math.round((subtotalCents * input.taxRateBp) / 10_000);
  return {
    id: input.id ?? createUuid(),
    orderId: input.orderId,
    productId: input.productId,
    nameSnapshot: input.nameSnapshot,
    unitPriceCents: input.unitPriceCents,
    quantity: input.quantity,
    pourSizeMl: input.pourSizeMl ?? null,
    taxRateBp: input.taxRateBp,
    taxCents,
    totalCents: subtotalCents + taxCents,
    isAdjustment: input.isAdjustment ?? false,
    createdAt: input.createdAt ?? new Date().toISOString(),
    ...(input.position === undefined ? {} : { position: input.position }),
  };
}
