import { createProduct } from "@kutana/shared/catalog/model/product.js";
import { createStockItem } from "@kutana/shared/inventory/model/stock-item.js";
import { describe, expect, it } from "vitest";
import { computeStockDisplay } from "./stock-display.js";

describe("computeStockDisplay", () => {
  it("shows a millilitre volume for a keg-backed draft beer, never a unit count", () => {
    const keg = createStockItem({
      id: "keg-1",
      name: "Keg",
      kind: "volume",
      unit: "ml",
      quantity: 4500,
      lowStockLevel: 3000,
    });
    const product = createProduct({
      sku: "DRAFT-500",
      name: "Pilsener 500ml",
      categoryId: "cat-1",
      priceCents: 350,
      taxRateBp: 1200,
      stockKind: "volume",
      pourSizeMl: 500,
      stockItemId: keg.id,
    });

    const result = computeStockDisplay(product, keg);

    expect(result.label).toBe("4.5 L");
    expect(result.label).not.toContain("units");
  });

  it("shows a unit count for a bottled product", () => {
    const bottle = createStockItem({
      id: "bottle-1",
      name: "Stout bottle",
      kind: "unit",
      unit: "ea",
      quantity: 48,
      lowStockLevel: 12,
    });
    const product = createProduct({
      sku: "BOTTLE-STOUT",
      name: "Stout Bottle",
      categoryId: "cat-1",
      priceCents: 380,
      taxRateBp: 1200,
      stockKind: "unit",
      stockItemId: bottle.id,
    });

    const result = computeStockDisplay(product, bottle);

    expect(result.label).toBe("48 unidades");
  });

  it("reports in-stock when quantity is above the low-stock threshold", () => {
    const item = createStockItem({
      name: "Item",
      kind: "unit",
      unit: "ea",
      quantity: 48,
      lowStockLevel: 12,
    });
    const product = createProduct({
      sku: "SKU-A",
      name: "A",
      categoryId: "cat-1",
      priceCents: 100,
      taxRateBp: 1200,
      stockKind: "unit",
      stockItemId: item.id,
    });

    expect(computeStockDisplay(product, item).status).toBe("in-stock");
  });

  it("reports low-stock at exactly the alert threshold", () => {
    const item = createStockItem({
      name: "Item",
      kind: "unit",
      unit: "ea",
      quantity: 12,
      lowStockLevel: 12,
    });
    const product = createProduct({
      sku: "SKU-B",
      name: "B",
      categoryId: "cat-1",
      priceCents: 100,
      taxRateBp: 1200,
      stockKind: "unit",
      stockItemId: item.id,
    });

    expect(computeStockDisplay(product, item).status).toBe("low-stock");
  });

  it("reports out-of-stock at zero quantity", () => {
    const item = createStockItem({
      name: "Item",
      kind: "unit",
      unit: "ea",
      quantity: 0,
      lowStockLevel: 12,
    });
    const product = createProduct({
      sku: "SKU-C",
      name: "C",
      categoryId: "cat-1",
      priceCents: 100,
      taxRateBp: 1200,
      stockKind: "unit",
      stockItemId: item.id,
    });

    expect(computeStockDisplay(product, item).status).toBe("out-of-stock");
  });

  it("shows no control when a product does not track stock", () => {
    const product = createProduct({
      sku: "SKU-D",
      name: "D",
      categoryId: "cat-1",
      priceCents: 100,
      taxRateBp: 1200,
      stockKind: "unit",
    });

    const result = computeStockDisplay(product, null);

    expect(result.status).toBe("no-stock-control");
    expect(result.label).toBe("Sin control");
  });
});
