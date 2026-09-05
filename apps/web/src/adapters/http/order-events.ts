import type {
  OrderEvent,
  OrderEvents,
  Unsubscribe,
} from "@kutana/shared/ordering/ports/order-events.js";

type Listener = (event: OrderEvent) => void;

/**
 * Browser-safe local event bus for HTTP composition until the backend exposes a
 * WebSocket/SSE order-events adapter. Repository state still lives behind the
 * HTTP repositories; this adapter only preserves same-tab publish/subscribe UI
 * behavior after local saves.
 */
export class LocalOrderEvents implements OrderEvents {
  private readonly listenersByOrder = new Map<string, Set<Listener>>();

  subscribe(orderId: string, callback: Listener): Unsubscribe {
    const listeners = this.listenersByOrder.get(orderId) ?? new Set<Listener>();
    listeners.add(callback);
    this.listenersByOrder.set(orderId, listeners);

    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listenersByOrder.delete(orderId);
      }
    };
  }

  publish(event: OrderEvent): void {
    const listeners = this.listenersByOrder.get(event.orderId);
    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      listener(event);
    }
  }
}
