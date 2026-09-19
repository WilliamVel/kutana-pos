import type { Product } from "@kutana/shared/catalog/model/product.js";
import type { StockItem } from "@kutana/shared/inventory/model/stock-item.js";

export type StockDisplayStatus = "in-stock" | "low-stock" | "out-of-stock" | "no-stock-control";

export interface StockDisplay {
  readonly status: StockDisplayStatus;
  readonly label: string;
}

function formatVolume(quantityMl: number): string {
  if (quantityMl >= 1000) {
    return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(quantityMl / 1000)} L`;
  }
  return `${new Intl.NumberFormat("en-US").format(quantityMl)} ml`;
}

/** Formats inventory for people without changing the stored ledger quantity. */
export function computeStockDisplay(product: Product, stockItem: StockItem | null): StockDisplay {
  if (!product.stockItemId || !stockItem) {
    return { status: "no-stock-control", label: "Sin control" };
  }

  const quantity = stockItem.quantity;
  const lowStockLevel = stockItem.lowStockLevel ?? product.lowStockLevel ?? null;
  const status: StockDisplayStatus =
    quantity <= 0
      ? "out-of-stock"
      : lowStockLevel !== null && quantity <= lowStockLevel
        ? "low-stock"
        : "in-stock";

  return {
    status,
    label: product.stockKind === "volume" ? formatVolume(quantity) : `${quantity} unidades`,
  };
}
