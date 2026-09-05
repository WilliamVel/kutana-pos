import type { Product } from "@kutana/shared/catalog/model/product.js";
import type { StockItem } from "@kutana/shared/inventory/model/stock-item.js";

export type StockDisplayStatus = "in-stock" | "low-stock" | "out-of-stock";

export interface StockDisplay {
  readonly status: StockDisplayStatus;
  readonly label: string;
}

/**
 * Pure, port-free formatting rule shared by the inventory list and the
 * product form: draft beer (stockKind 'volume') displays its shared keg's
 * remaining millilitres, never a "unit" count, because a keg is not sold in
 * discrete units. Unit-kind products (bottles, food) display a plain count.
 */
export function computeStockDisplay(product: Product, stockItem: StockItem | null): StockDisplay {
  const quantity = stockItem?.quantity ?? 0;
  const lowStockLevel = stockItem?.lowStockLevel ?? product.lowStockLevel ?? null;

  const status: StockDisplayStatus =
    quantity <= 0
      ? "out-of-stock"
      : lowStockLevel !== null && quantity <= lowStockLevel
        ? "low-stock"
        : "in-stock";

  const label = product.stockKind === "volume" ? `${quantity}ml` : `${quantity} unidades`;

  return { status, label };
}
