import type {
  OrderEvent,
  OrderEvents,
  Unsubscribe,
} from "@kutana/shared/ordering/ports/order-events.js";

type Listener = (event: OrderEvent) => void;

/**
 * In-process EventEmitter implementing the `OrderEvents` port, scoped per
 * `orderId`. Deliberately NOT Node's `node:events.EventEmitter`: this file
 * ships in the browser bundle (`apps/web`), and Vite does not polyfill
 * Node built-ins by default, so relying on `node:events` would work under
 * Vitest/jsdom but silently break `pnpm --filter web build`/`dev`. This
 * minimal implementation satisfies the exact same subscribe/publish
 * contract the design calls for, with zero Node dependency. The HTTP
 * counterpart is a shared global SSE subscription satisfying this same
 * interface.
 */
export class MockOrderEvents implements OrderEvents {
  private readonly listenersByOrder = new Map<string, Set<Listener>>();

  subscribe(orderId: string, callback: Listener): Unsubscribe {
    const listeners = this.listenersByOrder.get(orderId) ?? new Set<Listener>();
    listeners.add(callback);
    this.listenersByOrder.set(orderId, listeners);

    return () => {
      listeners.delete(callback);
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
