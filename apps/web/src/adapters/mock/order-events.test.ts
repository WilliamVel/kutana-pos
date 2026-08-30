import { describe, expect, it, vi } from "vitest";
import type { OrderEvent } from "@kutana/shared/ordering/ports/order-events.js";
import { MockOrderEvents } from "./order-events.js";

function buildEvent(overrides: Partial<OrderEvent> = {}): OrderEvent {
  return {
    type: "order.updated",
    orderId: "order-1",
    tableId: "table-1",
    version: 2,
    at: new Date().toISOString(),
    payload: {} as OrderEvent["payload"],
    ...overrides,
  };
}

describe("MockOrderEvents", () => {
  it("delivers a published event only to subscribers of that orderId", () => {
    const events = new MockOrderEvents();
    const forOrder1 = vi.fn();
    const forOrder2 = vi.fn();

    events.subscribe("order-1", forOrder1);
    events.subscribe("order-2", forOrder2);

    events.publish(buildEvent({ orderId: "order-1" }));

    expect(forOrder1).toHaveBeenCalledTimes(1);
    expect(forOrder2).not.toHaveBeenCalled();
  });

  it("stops delivering events after unsubscribe", () => {
    const events = new MockOrderEvents();
    const listener = vi.fn();
    const unsubscribe = events.subscribe("order-1", listener);

    unsubscribe();
    events.publish(buildEvent({ orderId: "order-1" }));

    expect(listener).not.toHaveBeenCalled();
  });

  it("does not throw when publishing to an orderId with no subscribers", () => {
    const events = new MockOrderEvents();
    expect(() => events.publish(buildEvent({ orderId: "order-nobody-listens" }))).not.toThrow();
  });
});
