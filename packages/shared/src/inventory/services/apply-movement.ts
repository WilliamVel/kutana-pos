import { ValidationError } from "../../errors/domain-error.js";
import type { StockItem } from "../model/stock-item.js";
import {
  createStockMovement,
  type StockMovement,
  type StockMovementReason,
} from "../model/stock-movement.js";

/**
 * Applies a single stock movement to a StockItem, in ONE ledger mechanism
 * shared by both stock kinds: `deltaMl` (despite the name, kept generic) is
 * the signed delta in the item's own unit — millilitres for a volume-kind
 * keg being poured at 500/750/1000ml, or unit count for a unit-kind item.
 * There is no branching on product/pour size here; the caller already
 * resolved the correct signed delta before calling this function.
 */
export function applyMovement(
  stockItem: StockItem,
  input: {
    deltaMl: number;
    reason: StockMovementReason;
    refType: string;
    refId: string;
  },
): { stockItem: StockItem; movement: StockMovement } {
  const nextQuantity = stockItem.quantity + input.deltaMl;
  if (nextQuantity < 0) {
    throw new ValidationError(
      `Stock movement would drive '${stockItem.name}' negative: ${stockItem.quantity} + (${input.deltaMl}) = ${nextQuantity}`,
    );
  }

  const movement = createStockMovement({
    stockItemId: stockItem.id,
    delta: input.deltaMl,
    reason: input.reason,
    refType: input.refType,
    refId: input.refId,
  });

  const updated: StockItem = {
    ...stockItem,
    quantity: nextQuantity,
    version: stockItem.version + 1,
  };

  return { stockItem: updated, movement };
}

/** Flags a stock item at or below its configured low-stock level. Items with no configured level are never flagged. */
export function isLowStock(stockItem: StockItem): boolean {
  if (stockItem.lowStockLevel === null) return false;
  return stockItem.quantity <= stockItem.lowStockLevel;
}
