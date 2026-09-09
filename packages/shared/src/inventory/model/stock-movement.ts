import { createUuid } from "../../platform/uuid.js";
/**
 * Append-only stock ledger entry. Never updated after creation.
 * `reason` is deliberately a TEXT-shaped string, not a closed union, so new
 * reasons (e.g. 'waste', 'production') can be added later without a schema
 * or type migration — extensible the same way payment methods are.
 */
export type StockMovementReason = "sale" | "restock" | "adjustment" | string;

export interface StockMovement {
  readonly id: string;
  readonly stockItemId: string;
  /** Signed delta in the stock item's own unit (ml for volume, count for unit). */
  readonly delta: number;
  readonly reason: StockMovementReason;
  readonly refType: string;
  readonly refId: string;
  readonly occurredAt: string;
}

export function createStockMovement(input: {
  stockItemId: string;
  delta: number;
  reason: StockMovementReason;
  refType: string;
  refId: string;
  id?: string;
  occurredAt?: string;
}): StockMovement {
  return {
    id: input.id ?? createUuid(),
    stockItemId: input.stockItemId,
    delta: input.delta,
    reason: input.reason,
    refType: input.refType,
    refId: input.refId,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  };
}
