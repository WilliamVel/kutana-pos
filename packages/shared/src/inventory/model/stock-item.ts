import { createUuid } from "../../platform/uuid.js";
export type StockUnit = "ea" | "ml";
export type StockItemKind = "unit" | "volume";

/**
 * A single stock item ledger balance. Draft beer at multiple pour sizes
 * (500/750/1000ml) all draw down the SAME shared volume-kind StockItem — a
 * pour decrements it by millilitres, never by "one glass". Unit-kind items
 * (bottles, food) decrement by count. Both flow through the same
 * `StockMovement` append-only ledger (see `applyMovement`).
 */
export interface StockItem {
  readonly id: string;
  readonly name: string;
  readonly kind: StockItemKind;
  readonly unit: StockUnit;
  readonly quantity: number;
  readonly lowStockLevel: number | null;
  readonly version: number;
}

export function createStockItem(input: {
  name: string;
  kind: StockItemKind;
  unit: StockUnit;
  quantity: number;
  lowStockLevel?: number | null;
  id?: string;
}): StockItem {
  return {
    id: input.id ?? createUuid(),
    name: input.name,
    kind: input.kind,
    unit: input.unit,
    quantity: input.quantity,
    lowStockLevel: input.lowStockLevel ?? null,
    version: 1,
  };
}
