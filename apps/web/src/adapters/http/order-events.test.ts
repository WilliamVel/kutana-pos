import { describe, expect, it, vi } from "vitest";
import type { Order } from "@kutana/shared/ordering/model/order.js";
import type { OrderEvent } from "@kutana/shared/ordering/ports/order-events.js";
import { LocalOrderEvents } from "./order-events.js";

function orderEvent(overrides: Partial<OrderEvent> = {}): OrderEvent {
  const order = {
    id: overrides.orderId ?? "order-1",
    tableId: overrides.tableId ?? "table-1",
    version: overrides.version ?? 1,
  } as Order;

  return {
    type: "order.updated",
    orderId: "order-1",
    tableId: "table-1",
    version: 1,
    at: "2025-01-01T00:00:00.000Z",
    payload: order,
    ...overrides,
  };
}

describe("LocalOrderEvents", () => {
  it("delivers published events to subscribers for the matching order", () => {
    const events = new LocalOrderEvents();
    const listener = vi.fn();
    const otherOrderListener = vi.fn();
    const event = orderEvent();

    events.subscribe("order-1", listener);
    events.subscribe("order-2", otherOrderListener);

    events.publish(event);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(event);
    expect(otherOrderListener).not.toHaveBeenCalled();
  });

  it("stops delivering events after unsubscribe", () => {
    const events = new LocalOrderEvents();
    const listener = vi.fn();
    const unsubscribe = events.subscribe("order-1", listener);

    unsubscribe();
    events.publish(orderEvent());

    expect(listener).not.toHaveBeenCalled();
  });
});
