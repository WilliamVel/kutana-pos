import { describe, expect, it } from "vitest";
import { buildSeedFixtures } from "./seed-fixtures.js";

describe("buildSeedFixtures", () => {
  it("seeds draft beer at 500/750/1000ml pour sizes sharing one keg StockItem each", () => {
    const { products, stockItems } = buildSeedFixtures();

    const pilsenerPours = products.filter((product) => product.sku.startsWith("DRAFT-PILS"));
    expect(
      pilsenerPours.map((product) => product.pourSizeMl).sort((a, b) => (a ?? 0) - (b ?? 0)),
    ).toEqual([500, 750, 1000]);

    const sharedStockItemIds = new Set(pilsenerPours.map((product) => product.stockItemId));
    expect(sharedStockItemIds.size).toBe(1);
    expect(stockItems.some((item) => item.id === [...sharedStockItemIds][0])).toBe(true);
  });

  it("gives each pour size its own independent price", () => {
    const { products } = buildSeedFixtures();
    const prices = products
      .filter((product) => product.sku.startsWith("DRAFT-PILS"))
      .map((product) => product.priceCents);

    expect(new Set(prices).size).toBe(prices.length);
  });

  it("seeds bottled beer and food as unit-kind products with no pour size", () => {
    const { products } = buildSeedFixtures();
    const nachos = products.find((product) => product.sku === "FOOD-NACHOS");
    const stout = products.find((product) => product.sku === "BOTTLE-STOUT-330");

    expect(nachos?.stockKind).toBe("unit");
    expect(nachos?.pourSizeMl).toBeNull();
    expect(stout?.stockKind).toBe("unit");
  });

  it("seeds three tables and marks the one with an open order as active", () => {
    const { tables, openOrder } = buildSeedFixtures();
    const occupied = tables.find((table) => table.currentOrderId === openOrder.id);

    expect(tables).toHaveLength(3);
    expect(occupied?.status).toBe("active");
    expect(tables.filter((table) => table.status === "free")).toHaveLength(2);
  });

  it("seeds one open order with line items already added", () => {
    const { openOrder } = buildSeedFixtures();
    expect(openOrder.status).toBe("active");
    expect(openOrder.lineItems.length).toBeGreaterThan(0);
  });
});
