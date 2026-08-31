import { describe, expect, it } from "vitest";
import { createOrder, requestCheck, markPaid } from "./order.js";
import { createTable, occupyTable } from "./table.js";
import { addLineItem, addAdjustmentLine, removeLineItem } from "../services/line-item-service.js";

describe("Order/Table status transitions", () => {
  it("starts a table free, then active once an order opens", () => {
    const table = createTable({ label: "T1" });
    expect(table.status).toBe("free");

    const order = createOrder({ tableId: table.id });
    const occupied = occupyTable(table, order.id);
    expect(occupied.status).toBe("active");
    expect(occupied.currentOrderId).toBe(order.id);
  });

  it("moves active -> needs_check -> paid, never skipping or reversing illegally", () => {
    const order = createOrder({ tableId: "table-1" });
    expect(order.status).toBe("active");

    const checked = requestCheck(order);
    expect(checked.status).toBe("needs_check");

    const paid = markPaid(checked);
    expect(paid.status).toBe("paid");
  });

  it("rejects requesting a check on an order that is already paid", () => {
    const order = createOrder({ tableId: "table-1" });
    const paid = markPaid(requestCheck(order));
    expect(() => requestCheck(paid)).toThrow();
  });

  it("rejects marking paid an order that has not requested its check", () => {
    const order = createOrder({ tableId: "table-1" });
    expect(() => markPaid(order)).toThrow();
  });
});

describe("LineItem immutability within an Order", () => {
  it("addLineItem appends a new line item without touching existing ones", () => {
    const order = createOrder({ tableId: "table-1" });
    const withOne = addLineItem(order, {
      productId: "p1",
      nameSnapshot: "House Lager",
      unitPriceCents: 250,
      quantity: 1,
      taxRateBp: 1200,
    });
    expect(withOne.lineItems).toHaveLength(1);
    const original = withOne.lineItems[0];

    const withTwo = addLineItem(withOne, {
      productId: "p2",
      nameSnapshot: "Fries",
      unitPriceCents: 300,
      quantity: 1,
      taxRateBp: 1200,
    });

    expect(withTwo.lineItems).toHaveLength(2);
    // the original line item object is untouched (same reference, same values)
    expect(withTwo.lineItems[0]).toBe(original);
  });

  it("corrections MUST be new adjustment lines, never in-place edits", () => {
    const order = createOrder({ tableId: "table-1" });
    const withOne = addLineItem(order, {
      productId: "p1",
      nameSnapshot: "House Lager",
      unitPriceCents: 250,
      quantity: 2,
      taxRateBp: 1200,
    });
    const original = withOne.lineItems[0]!;

    // A price correction is applied as a new negative adjustment line, not
    // an edit of `original`.
    const corrected = addAdjustmentLine(withOne, {
      correctsLineItemId: original.id,
      productId: original.productId,
      nameSnapshot: `Correction: ${original.nameSnapshot}`,
      unitPriceCents: -50,
      quantity: 1,
      taxRateBp: 1200,
    });

    expect(corrected.lineItems).toHaveLength(2);
    // the original line item is byte-for-byte unchanged
    expect(corrected.lineItems[0]).toBe(original);
    const adjustment = corrected.lineItems[1]!;
    expect(adjustment.isAdjustment).toBe(true);
    expect(adjustment.unitPriceCents).toBe(-50);
  });

  it("removeLineItem takes a mistakenly added item back off an unpaid order", () => {
    const order = createOrder({ tableId: "table-1" });
    const withOne = addLineItem(order, {
      productId: "p1",
      nameSnapshot: "House Lager",
      unitPriceCents: 250,
      quantity: 1,
      taxRateBp: 1200,
    });
    const withTwo = addLineItem(withOne, {
      productId: "p2",
      nameSnapshot: "Fries",
      unitPriceCents: 300,
      quantity: 1,
      taxRateBp: 1200,
    });
    const keep = withTwo.lineItems[0]!;
    const drop = withTwo.lineItems[1]!;

    const after = removeLineItem(withTwo, drop.id);

    expect(after.lineItems).toHaveLength(1);
    expect(after.lineItems[0]).toBe(keep);
    expect(after.version).toBe(withTwo.version + 1);
  });

  it("removeLineItem rejects an unknown line item id", () => {
    const order = createOrder({ tableId: "table-1" });
    expect(() => removeLineItem(order, "nope")).toThrow();
  });

  it("removeLineItem refuses to touch a paid order — use an adjustment instead", () => {
    const withOne = addLineItem(createOrder({ tableId: "table-1" }), {
      productId: "p1",
      nameSnapshot: "House Lager",
      unitPriceCents: 250,
      quantity: 1,
      taxRateBp: 1200,
    });
    const paid = markPaid(requestCheck(withOne));
    expect(() => removeLineItem(paid, paid.lineItems[0]!.id)).toThrow();
  });

  it("rejects adding a line item to a paid order", () => {
    const order = markPaid(requestCheck(createOrder({ tableId: "table-1" })));
    expect(() =>
      addLineItem(order, {
        productId: "p1",
        nameSnapshot: "House Lager",
        unitPriceCents: 250,
        quantity: 1,
        taxRateBp: 1200,
      }),
    ).toThrow();
  });
});
