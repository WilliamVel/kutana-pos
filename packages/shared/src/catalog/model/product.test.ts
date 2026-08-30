import { describe, expect, it } from "vitest";
import { createProduct, isOrderable, withActive } from "./product.js";

describe("Product", () => {
  it("creates a product with all required fields", () => {
    const product = createProduct({
      sku: "BEER-001",
      name: "House Lager",
      categoryId: "cat-1",
      priceCents: 250,
      taxRateBp: 1200,
      stockKind: "unit",
    });

    expect(product.sku).toBe("BEER-001");
    expect(product.name).toBe("House Lager");
    expect(product.categoryId).toBe("cat-1");
    expect(product.priceCents).toBe(250);
    expect(product.taxRateBp).toBe(1200);
    expect(product.active).toBe(true);
    expect(product.barcode).toBeNull();
    expect(product.imageUrl).toBeNull();
    expect(product.lowStockLevel).toBeNull();
  });

  it("rejects a product with a negative price", () => {
    expect(() =>
      createProduct({
        sku: "BEER-001",
        name: "House Lager",
        categoryId: "cat-1",
        priceCents: -1,
        taxRateBp: 1200,
        stockKind: "unit",
      }),
    ).toThrow();
  });

  it("rejects a volume-kind product without a pour size", () => {
    expect(() =>
      createProduct({
        sku: "DRAFT-500",
        name: "Draft 500ml",
        categoryId: "cat-1",
        priceCents: 300,
        taxRateBp: 1200,
        stockKind: "volume",
      }),
    ).toThrow();
  });

  it("accepts a volume-kind product with a pour size and stock item reference", () => {
    const product = createProduct({
      sku: "DRAFT-500",
      name: "Draft 500ml",
      categoryId: "cat-1",
      priceCents: 300,
      taxRateBp: 1200,
      stockKind: "volume",
      pourSizeMl: 500,
      stockItemId: "keg-1",
    });
    expect(product.pourSizeMl).toBe(500);
    expect(product.stockItemId).toBe("keg-1");
  });

  it("hides an inactive product from ordering", () => {
    const active = createProduct({
      sku: "BEER-001",
      name: "House Lager",
      categoryId: "cat-1",
      priceCents: 250,
      taxRateBp: 1200,
      stockKind: "unit",
    });
    expect(isOrderable(active)).toBe(true);

    const inactive = withActive(active, false);
    expect(isOrderable(inactive)).toBe(false);
    // toggling active never mutates the original, immutable-style update
    expect(active.active).toBe(true);
  });
});
