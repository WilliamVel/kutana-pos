import { describe, expect, it } from "vitest";
import { createProduct } from "../model/product.js";
import { snapshotTaxForSale } from "./tax-at-sale.js";

describe("tax-at-sale: tax is frozen at the moment of sale", () => {
  it("computes and freezes tax at the product's CURRENT rate when a line item is created", () => {
    const product = createProduct({
      sku: "BEER-001",
      name: "House Lager",
      categoryId: "cat-1",
      priceCents: 1000,
      taxRateBp: 1200,
      stockKind: "unit",
    });

    const snapshot = snapshotTaxForSale(product, { quantity: 1 });

    expect(snapshot.taxRateBp).toBe(1200);
    expect(snapshot.taxCents).toBe(120);
  });

  it("a later catalog tax rate change does NOT retroactively alter a historical snapshot", () => {
    const originalProduct = createProduct({
      sku: "BEER-001",
      name: "House Lager",
      categoryId: "cat-1",
      priceCents: 1000,
      taxRateBp: 1200,
      stockKind: "unit",
    });

    // A historical LineItem was created and its tax snapshot frozen at 12%.
    const historicalSnapshot = snapshotTaxForSale(originalProduct, { quantity: 1 });
    expect(historicalSnapshot.taxRateBp).toBe(1200);
    expect(historicalSnapshot.taxCents).toBe(120);

    // The catalog's rate changes later (e.g. tax law update) — a NEW Product
    // value representing the updated catalog state, never mutating the old one.
    const updatedProduct = { ...originalProduct, taxRateBp: 1500 };

    // The historical snapshot object itself is untouched — it is immutable data,
    // not a live reference to the product's current rate.
    expect(historicalSnapshot.taxRateBp).toBe(1200);
    expect(historicalSnapshot.taxCents).toBe(120);

    // A NEW sale against the updated product correctly uses the new rate,
    // proving the function reads the rate passed in, not a cached global.
    const newSnapshot = snapshotTaxForSale(updatedProduct, { quantity: 1 });
    expect(newSnapshot.taxRateBp).toBe(1500);
    expect(newSnapshot.taxCents).toBe(150);

    // The historical snapshot remains unaffected by the new sale.
    expect(historicalSnapshot.taxRateBp).toBe(1200);
  });

  it("scales tax with quantity", () => {
    const product = createProduct({
      sku: "BEER-001",
      name: "House Lager",
      categoryId: "cat-1",
      priceCents: 1000,
      taxRateBp: 1200,
      stockKind: "unit",
    });
    const snapshot = snapshotTaxForSale(product, { quantity: 3 });
    expect(snapshot.subtotalCents).toBe(3000);
    expect(snapshot.taxCents).toBe(360);
  });
});
