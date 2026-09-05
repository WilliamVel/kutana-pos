import { describe, expect, it, vi } from "vitest";
import type { Order } from "@kutana/shared/ordering/model/order.js";
import type { OrderEvent } from "@kutana/shared/ordering/ports/order-events.js";
import { HttpOrderEvents } from "./order-events.js";

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

class FakeEventSource {
  static instances: FakeEventSource[] = [];

  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  readonly close = vi.fn();

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  emit(event: OrderEvent): void {
    this.onmessage?.({ data: JSON.stringify(event) } as MessageEvent<string>);
  }
}

describe("HttpOrderEvents", () => {
  it("delivers published events to subscribers for the matching order without fetching repository state", () => {
    const events = new HttpOrderEvents({
      baseUrl: "http://api.example.test",
      EventSourceImpl: FakeEventSource,
    });
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

  it("subscribes to the backend SSE stream using the HTTP base URL pattern", () => {
    FakeEventSource.instances = [];
    const events = new HttpOrderEvents({
      baseUrl: "http://api.example.test/",
      EventSourceImpl: FakeEventSource,
    });
    const listener = vi.fn();
    const event = orderEvent({ orderId: "order/1" });

    events.subscribe("order/1", listener);
    FakeEventSource.instances[0]?.emit(event);

    expect(FakeEventSource.instances.map((source) => source.url)).toEqual([
      "http://api.example.test/ordering/orders/order%2F1/events",
    ]);
    expect(listener).toHaveBeenCalledWith(event);
  });

  it("deduplicates a backend echo after a same-tab publish", () => {
    FakeEventSource.instances = [];
    const events = new HttpOrderEvents({
      baseUrl: "http://api.example.test",
      EventSourceImpl: FakeEventSource,
    });
    const listener = vi.fn();
    const event = orderEvent({ orderId: "order-1", version: 7 });

    events.subscribe("order-1", listener);
    events.publish(event);
    FakeEventSource.instances[0]?.emit(event);

    expect(listener).toHaveBeenCalledOnce();
  });

  it("stops backend and local delivery after unsubscribe", () => {
    FakeEventSource.instances = [];
    const events = new HttpOrderEvents({
      baseUrl: "http://api.example.test",
      EventSourceImpl: FakeEventSource,
    });
    const listener = vi.fn();
    const unsubscribe = events.subscribe("order-1", listener);

    unsubscribe();
    events.publish(orderEvent());

    expect(listener).not.toHaveBeenCalled();
    expect(FakeEventSource.instances[0]?.close).toHaveBeenCalledOnce();
  });
});
