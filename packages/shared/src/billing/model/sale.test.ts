import { describe, expect, it } from "vitest";
import { createSale } from "./sale.js";

describe("createSale", () => {
  it("creates a USD closure snapshot with explicit attribution and immutable collections", () => {
    const items = [{ id: "item-1", saleId: "sale-1", productId: "p-1", name: "Coffee", quantity: 1, unitPriceCents: 500, subtotalCents: 500, taxCents: 50, discountCents: 0, totalCents: 550, accountId: "account-1", customerId: "customer-1" }];
    const sale = createSale({ id: "sale-1", orderId: "order-1", subtotalCents: 500, taxTotalCents: 50, totalCents: 550, paidCents: 550, closedAt: "2025-01-02T00:00:00.000Z", closedByUserId: "user-1", items });
    expect(sale).toMatchObject({ currencyCode: "USD", status: "paid", closedByUserId: "user-1", tableId: null, discountTotalCents: 0 });
    expect(sale.items).toEqual(items);
    expect(Object.isFrozen(sale.items)).toBe(true);
  });

  it("preserves pending debt explicitly", () => {
    const sale = createSale({ orderId: "order-1", subtotalCents: 1000, taxTotalCents: 0, totalCents: 1000, paidCents: 400, pendingCents: 600, status: "pending" });
    expect(sale.status).toBe("pending");
    expect(sale.pendingCents).toBe(600);
  });
});
