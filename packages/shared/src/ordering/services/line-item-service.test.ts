import { describe, expect, it } from "vitest";
import { createOrder } from "../model/order.js";
import { addLineItem, removeLineItem, removeLineItemUnit } from "./line-item-service.js";

describe("removeLineItemUnit", () => {
  it("replaces a multi-unit line with one fewer unit", () => {
    let order = createOrder({ tableId: "table-1" });
    order = addLineItem(order, {
      productId: "product-1",
      nameSnapshot: "Blonde Ale",
      unitPriceCents: 896,
      quantity: 3,
      taxRateBp: 1200,
      pourSizeMl: 1000,
    });
    const original = { ...order.lineItems[0]!, createdAt: "2025-01-02T00:00:00.000Z" };
    const following = addLineItem(order, {
      productId: "product-2",
      nameSnapshot: "Loaded Nachos",
      unitPriceCents: 1200,
      quantity: 1,
      taxRateBp: 1200,
    }).lineItems[1]!;
    const preceding = { ...following, id: "preceding-line", createdAt: "2025-01-01T00:00:00.000Z" };
    const later = { ...following, id: "later-line", createdAt: "2025-01-03T00:00:00.000Z" };

    const next = removeLineItemUnit({ ...order, lineItems: [preceding, original, later] }, original.id);

    expect(next.lineItems).toHaveLength(3);
    expect(next.lineItems[0]).toBe(preceding);
    expect(next.lineItems[1]).toMatchObject({
      productId: original.productId,
      quantity: 2,
      totalCents: 2007,
      taxCents: 215,
      createdAt: original.createdAt,
    });
    expect(next.lineItems[1]!.id).not.toBe(original.id);
    expect(next.lineItems[2]).toBe(later);
  });

  it("keeps a tied-timestamp line in its position after decrement", () => {
    let order = createOrder({ tableId: "table-1" });
    order = addLineItem(order, { productId: "product-1", nameSnapshot: "First", unitPriceCents: 100, quantity: 2, taxRateBp: 0 });
    order = addLineItem(order, { productId: "product-2", nameSnapshot: "Second", unitPriceCents: 200, quantity: 1, taxRateBp: 0 });
    order = addLineItem(order, { productId: "product-3", nameSnapshot: "Third", unitPriceCents: 300, quantity: 1, taxRateBp: 0 });
    const tiedAt = "2025-01-01T00:00:00.000Z";
    const tied = order.lineItems.map((item) => ({ ...item, createdAt: tiedAt }));

    const next = removeLineItemUnit({ ...order, lineItems: tied }, tied[0]!.id);

    expect(next.lineItems.map((item) => item.nameSnapshot)).toEqual(["First", "Second", "Third"]);
    expect(next.lineItems[0]).toMatchObject({ position: 0, quantity: 1 });
    expect(next.lineItems[1]).toMatchObject({ position: 1 });
  });

  it("keeps whole-line removal for a single-unit line", () => {
    let order = createOrder({ tableId: "table-1" });
    order = addLineItem(order, {
      productId: "product-1",
      nameSnapshot: "Blonde Ale",
      unitPriceCents: 896,
      quantity: 1,
      taxRateBp: 1200,
    });

    const next = removeLineItemUnit(order, order.lineItems[0]!.id);

    expect(next.lineItems).toHaveLength(0);
  });

  it("retains the existing whole-line removal service", () => {
    let order = createOrder({ tableId: "table-1" });
    order = addLineItem(order, {
      productId: "product-1",
      nameSnapshot: "Blonde Ale",
      unitPriceCents: 896,
      quantity: 3,
      taxRateBp: 1200,
    });

    expect(removeLineItem(order, order.lineItems[0]!.id).lineItems).toHaveLength(0);
  });
});
