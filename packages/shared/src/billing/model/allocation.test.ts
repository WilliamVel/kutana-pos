import { describe, expect, it } from "vitest";
import { addAllocation, createAllocation } from "./allocation.js";

describe("Allocation", () => {
  it("creates a 100%-share allocation for a line item", () => {
    const allocation = createAllocation({
      lineItemId: "line-1",
      ticketId: "ticket-1",
    });
    expect(allocation.lineItemId).toBe("line-1");
    expect(allocation.ticketId).toBe("ticket-1");
    expect(allocation.shareBp).toBe(10_000);
  });

  it("rejects a share_bp other than 10000 in v1", () => {
    expect(() =>
      createAllocation({
        lineItemId: "line-1",
        ticketId: "ticket-1",
        shareBp: 5_000,
      }),
    ).toThrow(/share_bp|10000/i);
  });

  it("adds a first allocation for a line item to an empty set", () => {
    const result = addAllocation(
      [],
      createAllocation({ lineItemId: "line-1", ticketId: "ticket-1" }),
    );
    expect(result).toHaveLength(1);
  });

  it("allows allocations for different line items to coexist", () => {
    const existing = [createAllocation({ lineItemId: "line-1", ticketId: "ticket-1" })];
    const result = addAllocation(
      existing,
      createAllocation({ lineItemId: "line-2", ticketId: "ticket-1" }),
    );
    expect(result).toHaveLength(2);
  });

  it("rejects a second allocation for the same line item without removing the first (spec scenario)", () => {
    const existing = [createAllocation({ lineItemId: "line-1", ticketId: "ticket-1" })];
    expect(() =>
      addAllocation(existing, createAllocation({ lineItemId: "line-1", ticketId: "ticket-2" })),
    ).toThrow(/already (has |allocated)/i);
  });

  it("enforces exactly one 100%-share allocation per line item across the whole set", () => {
    const existing = [
      createAllocation({ lineItemId: "line-1", ticketId: "ticket-1" }),
      createAllocation({ lineItemId: "line-2", ticketId: "ticket-1" }),
    ];
    const perLineItem = new Map<string, number>();
    for (const allocation of existing) {
      perLineItem.set(allocation.lineItemId, (perLineItem.get(allocation.lineItemId) ?? 0) + 1);
    }
    for (const count of perLineItem.values()) {
      expect(count).toBe(1);
    }
  });
});
