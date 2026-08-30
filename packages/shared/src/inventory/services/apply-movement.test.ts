import { describe, expect, it } from "vitest";
import { createStockItem } from "../model/stock-item.js";
import { applyMovement, isLowStock } from "./apply-movement.js";

describe("applyMovement — volume-kind stock (draft beer)", () => {
  it("decrements a shared keg by 500ml when a 500ml glass is sold", () => {
    const keg = createStockItem({
      name: "House Lager Keg",
      kind: "volume",
      unit: "ml",
      quantity: 5000,
    });

    const { stockItem, movement } = applyMovement(keg, {
      deltaMl: -500,
      reason: "sale",
      refType: "line_item",
      refId: "li-1",
    });

    expect(stockItem.quantity).toBe(4500);
    expect(movement.delta).toBe(-500);
    expect(movement.stockItemId).toBe(keg.id);
    expect(movement.reason).toBe("sale");
  });

  it("decrements the SAME shared keg for 750ml and 1000ml pours (volume, not unit-count)", () => {
    const keg = createStockItem({
      name: "House Lager Keg",
      kind: "volume",
      unit: "ml",
      quantity: 5000,
    });

    const afterFirst = applyMovement(keg, {
      deltaMl: -750,
      reason: "sale",
      refType: "line_item",
      refId: "li-1",
    });
    const afterSecond = applyMovement(afterFirst.stockItem, {
      deltaMl: -1000,
      reason: "sale",
      refType: "line_item",
      refId: "li-2",
    });

    expect(afterSecond.stockItem.quantity).toBe(5000 - 750 - 1000);
  });

  it("rejects a volume movement that would drive stock negative", () => {
    const keg = createStockItem({
      name: "Almost Empty Keg",
      kind: "volume",
      unit: "ml",
      quantity: 200,
    });
    expect(() =>
      applyMovement(keg, { deltaMl: -500, reason: "sale", refType: "line_item", refId: "li-1" }),
    ).toThrow();
  });
});

describe("applyMovement — unit-kind stock (bottles, food)", () => {
  it("decrements by unit count, not volume", () => {
    const bottles = createStockItem({
      name: "Bottled IPA",
      kind: "unit",
      unit: "ea",
      quantity: 24,
    });

    const { stockItem } = applyMovement(bottles, {
      deltaMl: -3,
      reason: "sale",
      refType: "line_item",
      refId: "li-3",
    });

    expect(stockItem.quantity).toBe(21);
  });

  it("supports a positive restock movement", () => {
    const bottles = createStockItem({ name: "Bottled IPA", kind: "unit", unit: "ea", quantity: 5 });
    const { stockItem } = applyMovement(bottles, {
      deltaMl: 12,
      reason: "restock",
      refType: "purchase_order",
      refId: "po-1",
    });
    expect(stockItem.quantity).toBe(17);
  });
});

describe("lowStockCheck", () => {
  it("flags a stock item at or below its low-stock level", () => {
    const keg = createStockItem({
      name: "House Lager Keg",
      kind: "volume",
      unit: "ml",
      quantity: 400,
      lowStockLevel: 500,
    });
    expect(isLowStock(keg)).toBe(true);
  });

  it("flags a stock item sitting exactly on its low-stock level", () => {
    const keg = createStockItem({
      name: "House Lager Keg",
      kind: "volume",
      unit: "ml",
      quantity: 500,
      lowStockLevel: 500,
    });
    expect(isLowStock(keg)).toBe(true);
  });

  it("does not flag a stock item one unit above its low-stock level", () => {
    const keg = createStockItem({
      name: "House Lager Keg",
      kind: "volume",
      unit: "ml",
      quantity: 501,
      lowStockLevel: 500,
    });
    expect(isLowStock(keg)).toBe(false);
  });

  it("does not flag a stock item above its low-stock level", () => {
    const keg = createStockItem({
      name: "House Lager Keg",
      kind: "volume",
      unit: "ml",
      quantity: 4500,
      lowStockLevel: 500,
    });
    expect(isLowStock(keg)).toBe(false);
  });

  it("never flags a stock item with no configured low-stock level", () => {
    const keg = createStockItem({
      name: "House Lager Keg",
      kind: "volume",
      unit: "ml",
      quantity: 0,
    });
    expect(isLowStock(keg)).toBe(false);
  });
});
