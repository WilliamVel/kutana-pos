import type {
  OrderEvent,
  OrderEvents,
  Unsubscribe,
} from "@kutana/shared/ordering/ports/order-events.js";
import type { HttpClientOptions } from "./http-client.js";
import { defaultApiBaseUrl, encodePathSegment } from "./http-client.js";

type Listener = (event: OrderEvent) => void;
type EventSourceConstructor = new (url: string) => Pick<EventSource, "close" | "onmessage">;

export interface HttpOrderEventsOptions extends HttpClientOptions {
  readonly EventSourceImpl?: EventSourceConstructor;
}

interface SubscriptionState {
  readonly listeners: Set<Listener>;
  readonly source: Pick<EventSource, "close" | "onmessage"> | null;
}

/**
 * SSE-backed order-events adapter. It preserves same-tab fanout for local
 * publishes while subscribing to backend post-commit order snapshots for other
 * tabs/devices. The adapter never reads or owns repository state.
 */
export class HttpOrderEvents implements OrderEvents {
  private readonly baseUrl: string;
  private readonly EventSourceImpl?: EventSourceConstructor;
  private readonly subscriptionsByOrder = new Map<string, SubscriptionState>();
  private readonly locallyPublishedKeys = new Set<string>();

  constructor(options: HttpOrderEventsOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? defaultApiBaseUrl());
    this.EventSourceImpl = options.EventSourceImpl ?? globalThis.EventSource;
  }

  subscribe(orderId: string, callback: Listener): Unsubscribe {
    const state = this.subscriptionsByOrder.get(orderId) ?? this.openSubscription(orderId);
    state.listeners.add(callback);
    this.subscriptionsByOrder.set(orderId, state);

    return () => {
      state.listeners.delete(callback);
      if (state.listeners.size === 0) {
        state.source?.close();
        this.subscriptionsByOrder.delete(orderId);
      }
    };
  }

  publish(event: OrderEvent): void {
    if (this.deliver(event)) {
      this.locallyPublishedKeys.add(eventKey(event));
    }
  }

  private openSubscription(orderId: string): SubscriptionState {
    const source = this.EventSourceImpl ? new this.EventSourceImpl(this.eventsUrl(orderId)) : null;

    if (source) {
      source.onmessage = (message) => {
        const event = JSON.parse(message.data) as OrderEvent;
        const key = eventKey(event);
        if (this.locallyPublishedKeys.delete(key)) {
          return;
        }

        this.deliver(event);
      };
    }

    return { listeners: new Set<Listener>(), source };
  }

  private deliver(event: OrderEvent): boolean {
    const listeners = this.subscriptionsByOrder.get(event.orderId)?.listeners;
    if (!listeners || listeners.size === 0) {
      return false;
    }

    for (const listener of listeners) {
      listener(event);
    }
    return true;
  }

  private eventsUrl(orderId: string): string {
    return `${this.baseUrl}/ordering/orders/${encodePathSegment(orderId)}/events`;
  }
}

function eventKey(event: OrderEvent): string {
  return `${event.orderId}:${event.type}:${event.version}`;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}
