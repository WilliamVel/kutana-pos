import { describe, expect, it } from "vitest";
import { createLineItem } from "../../ordering/model/line-item.js";
import {
  addAccountLineAllocation,
  accountBalance,
  createAccountLineAllocation,
  createCustomer,
  createPersonalAccount,
  derivePersonalAccountStatus,
} from "./personal-account.js";

function lineItem(input: {
  id: string;
  quantity: number;
  unitPriceCents: number;
  taxRateBp?: number;
}) {
  return createLineItem({
    id: input.id,
    orderId: "order-1",
    productId: `product-${input.id}`,
    nameSnapshot: "Item",
    unitPriceCents: input.unitPriceCents,
    quantity: input.quantity,
    taxRateBp: input.taxRateBp ?? 0,
    createdAt: "2025-01-01T00:00:00.000Z",
  });
}

describe("Customer", () => {
  it("creates a stable identified customer without encoding matching assumptions", () => {
    const customer = createCustomer({
      id: "customer-1",
      displayName: "Juan P.",
      phone: null,
      email: null,
      notes: "prefers patio",
      now: "2025-01-01T00:00:00.000Z",
    });

    expect(customer).toMatchObject({
      id: "customer-1",
      displayName: "Juan P.",
      phone: null,
      email: null,
      notes: "prefers patio",
    });
    expect(customer.createdAt).toBe("2025-01-01T00:00:00.000Z");
    expect(customer.updatedAt).toBe("2025-01-01T00:00:00.000Z");
  });
});

describe("PersonalAccount", () => {
  it("requires exactly one owner: identified customer or non-empty free-name", () => {
    expect(createPersonalAccount({ orderId: "order-1", customerId: "customer-1" }).owner).toEqual({
      kind: "customer",
      customerId: "customer-1",
    });
    expect(createPersonalAccount({ orderId: "order-1", freeName: " Juan P. " }).owner).toEqual({
      kind: "free_name",
      freeName: "Juan P.",
    });

    expect(() => createPersonalAccount({ orderId: "order-1" })).toThrow(/owner/i);
    expect(() => createPersonalAccount({ orderId: "order-1", freeName: "   " })).toThrow(
      /free-name/i,
    );
    expect(() =>
      createPersonalAccount({ orderId: "order-1", customerId: "customer-1", freeName: "Juan" }),
    ).toThrow(/exactly one/i);
  });

  it("derives open, partially_paid, paid, and pending statuses from payments and pending marker", () => {
    expect(derivePersonalAccountStatus({ totalCents: 1000, paidCents: 0, isPending: false })).toBe(
      "open",
    );
    expect(
      derivePersonalAccountStatus({ totalCents: 1000, paidCents: 400, isPending: false }),
    ).toBe("partially_paid");
    expect(
      derivePersonalAccountStatus({ totalCents: 1000, paidCents: 1000, isPending: false }),
    ).toBe("paid");
    expect(derivePersonalAccountStatus({ totalCents: 1000, paidCents: 400, isPending: true })).toBe(
      "pending",
    );
  });
});

describe("AccountLineAllocation", () => {
  it("allocates line items to accounts by quantity and calculates remaining quantity", () => {
    const item = lineItem({ id: "line-1", quantity: 3, unitPriceCents: 500 });
    const allocation = createAccountLineAllocation({
      id: "allocation-1",
      accountId: "account-1",
      lineItemId: item.id,
      quantity: 1,
    });

    const result = addAccountLineAllocation({
      allocations: [],
      lineItems: [item],
      next: allocation,
    });

    expect(result.allocations).toEqual([allocation]);
    expect(result.remainingQuantityByLineItem[item.id]).toBe(2);

    const accumulated = addAccountLineAllocation({
      allocations: result.allocations,
      lineItems: [item],
      next: createAccountLineAllocation({
        accountId: "account-1",
        lineItemId: item.id,
        quantity: 1,
      }),
    });
    expect(accumulated.allocations).toHaveLength(1);
    expect(accumulated.allocations[0]).toMatchObject({ id: "allocation-1", quantity: 2 });
    expect(accumulated.remainingQuantityByLineItem[item.id]).toBe(1);
  });

  it("rejects over-allocation beyond the source line item quantity", () => {
    const item = lineItem({ id: "line-1", quantity: 2, unitPriceCents: 500 });
    const existing = [
      createAccountLineAllocation({ accountId: "account-1", lineItemId: item.id, quantity: 2 }),
    ];

    expect(() =>
      addAccountLineAllocation({
        allocations: existing,
        lineItems: [item],
        next: createAccountLineAllocation({
          accountId: "account-2",
          lineItemId: item.id,
          quantity: 1,
        }),
      }),
    ).toThrow(/over-allocate/i);
  });

  it("does not accept arbitrary amount-based allocation", () => {
    expect(() =>
      createAccountLineAllocation({
        accountId: "account-1",
        lineItemId: "line-1",
        quantity: 1,
        amountCents: 400,
      } as Parameters<typeof createAccountLineAllocation>[0] & { amountCents: number }),
    ).toThrow(/amount/i);
  });

  it("calculates account total, paid amount, and remaining balance from allocated quantities", () => {
    const taco = lineItem({ id: "line-1", quantity: 3, unitPriceCents: 500 });
    const drink = lineItem({ id: "line-2", quantity: 2, unitPriceCents: 200, taxRateBp: 1000 });
    const allocations = [
      createAccountLineAllocation({ accountId: "account-1", lineItemId: taco.id, quantity: 2 }),
      createAccountLineAllocation({ accountId: "account-1", lineItemId: drink.id, quantity: 1 }),
    ];

    const balance = accountBalance({
      accountId: "account-1",
      lineItems: [taco, drink],
      allocations,
      payments: [{ accountId: "account-1", amountCents: 400 }],
    });

    expect(balance).toEqual({ totalCents: 1220, paidCents: 400, remainingCents: 820 });
  });
});
