import { describe, expect, it } from "vitest";
import { createLineItem } from "../../ordering/model/line-item.js";
import { createOrder, requestCheck } from "../../ordering/model/order.js";
import {
  createAccountLineAllocation,
  createPersonalAccount,
  type AccountLineAllocation,
  type AccountPaymentAmount,
  type PersonalAccount,
} from "./personal-account.js";
import { closeOrderWithPersonalAccounts } from "./order-closure.js";

function lineItem(input: { id: string; quantity: number; unitPriceCents: number }) {
  return createLineItem({
    id: input.id,
    orderId: "order-1",
    productId: `product-${input.id}`,
    nameSnapshot: `Item ${input.id}`,
    unitPriceCents: input.unitPriceCents,
    quantity: input.quantity,
    taxRateBp: 0,
    createdAt: "2025-01-01T00:00:00.000Z",
  });
}

function account(input: { id: string; status?: PersonalAccount["status"] }): PersonalAccount {
  return {
    ...createPersonalAccount({ id: input.id, orderId: "order-1", customerId: `customer-${input.id}` }),
    status: input.status ?? "paid",
  };
}

function allocation(input: { id: string; accountId: string; lineItemId: string; quantity: number }) {
  return createAccountLineAllocation(input);
}

const noPayments: readonly AccountPaymentAmount[] = [];

describe("closeOrderWithPersonalAccounts", () => {
  it("puts the order in_review when sold line-item quantities are unassigned", () => {
    const item = lineItem({ id: "line-1", quantity: 3, unitPriceCents: 500 });
    const original = requestCheck({ ...createOrder({ id: "order-1", tableId: "table-1" }), lineItems: [item] });
    const result = closeOrderWithPersonalAccounts({
      order: original,
      accounts: [account({ id: "account-1", status: "paid" })],
      allocations: [allocation({ id: "allocation-1", accountId: "account-1", lineItemId: item.id, quantity: 2 })],
      payments: noPayments,
      closedAt: "2025-01-02T00:00:00.000Z",
    });

    expect(result.kind).toBe("review_required");
    if (result.kind !== "review_required") throw new Error("expected review_required result");
    expect(result.order.status).toBe("in_review");
    expect(result.unresolvedLineItems).toEqual([{ lineItemId: item.id, soldQuantity: 3, assignedQuantity: 2, unresolvedQuantity: 1 }]);
  });

  it("closes as paid when every line-item quantity is assigned to paid accounts", () => {
    const item = lineItem({ id: "line-1", quantity: 3, unitPriceCents: 500 });
    const original = requestCheck({ ...createOrder({ id: "order-1", tableId: "table-1" }), lineItems: [item] });
    const result = closeOrderWithPersonalAccounts({
      order: original,
      accounts: [account({ id: "account-1", status: "paid" })],
      allocations: [allocation({ id: "allocation-1", accountId: "account-1", lineItemId: item.id, quantity: 3 })],
      payments: noPayments,
      closedAt: "2025-01-02T00:00:00.000Z",
    });

    expect(result.kind).toBe("closed");
    expect(result.order.status).toBe("paid");
    expect(result.order.closedAt).toBe("2025-01-02T00:00:00.000Z");
  });

  it("closes with pending debt when every quantity is assigned and at least one account is pending", () => {
    const item = lineItem({ id: "line-1", quantity: 2, unitPriceCents: 500 });
    const original = requestCheck({ ...createOrder({ id: "order-1", tableId: "table-1" }), lineItems: [item] });
    const result = closeOrderWithPersonalAccounts({
      order: original,
      accounts: [account({ id: "account-1", status: "pending" })],
      allocations: [allocation({ id: "allocation-1", accountId: "account-1", lineItemId: item.id, quantity: 2 })],
      payments: noPayments,
      closedAt: "2025-01-02T00:00:00.000Z",
    });

    expect(result.kind).toBe("closed");
    expect(result.order.status).toBe("closed_with_pending");
  });

  it("does not reopen or mutate original line items during closure", () => {
    const item = lineItem({ id: "line-1", quantity: 1, unitPriceCents: 500 });
    const original = requestCheck({ ...createOrder({ id: "order-1", tableId: "table-1" }), lineItems: [item] });
    const beforeSnapshot = { ...item };

    const result = closeOrderWithPersonalAccounts({
      order: original,
      accounts: [account({ id: "account-1", status: "paid" })],
      allocations: [allocation({ id: "allocation-1", accountId: "account-1", lineItemId: item.id, quantity: 1 })],
      payments: noPayments,
      closedAt: "2025-01-02T00:00:00.000Z",
    });

    expect(result.order.lineItems[0]).toBe(item);
    expect(item).toEqual(beforeSnapshot);
    expect(original.status).toBe("needs_check");
  });

  it("cannot close silently with unassigned or over-assigned quantities", () => {
    const item = lineItem({ id: "line-1", quantity: 2, unitPriceCents: 500 });
    const original = requestCheck({ ...createOrder({ id: "order-1", tableId: "table-1" }), lineItems: [item] });
    const allocations: readonly AccountLineAllocation[] = [
      allocation({ id: "allocation-1", accountId: "account-1", lineItemId: item.id, quantity: 3 }),
    ];

    const result = closeOrderWithPersonalAccounts({
      order: original,
      accounts: [account({ id: "account-1", status: "paid" })],
      allocations,
      payments: noPayments,
      closedAt: "2025-01-02T00:00:00.000Z",
    });

    expect(result.kind).toBe("review_required");
    if (result.kind !== "review_required") throw new Error("expected review_required result");
    expect(result.order.status).toBe("in_review");
    expect(result.unresolvedLineItems).toEqual([{ lineItemId: item.id, soldQuantity: 2, assignedQuantity: 3, unresolvedQuantity: -1 }]);
  });
});
