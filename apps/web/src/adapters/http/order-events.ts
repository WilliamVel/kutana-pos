import type {
  OrderEvent,
  OrderEvents,
  Unsubscribe,
} from "@kutana/shared/ordering/ports/order-events.js";
import type { HttpClientOptions } from "./http-client.js";
import { defaultApiBaseUrl } from "./http-client.js";

type Listener = (event: OrderEvent) => void;
type EventSourceConstructor = new (url: string) => Pick<EventSource, "close" | "onmessage">;

export interface HttpOrderEventsOptions extends HttpClientOptions {
  readonly EventSourceImpl?: EventSourceConstructor;
}

/**
 * SSE-backed order-events adapter. A single global stream is shared by every
 * order subscription; routing to order listeners happens in this adapter.
 */
export class HttpOrderEvents implements OrderEvents {
  private readonly baseUrl: string;
  private readonly EventSourceImpl?: EventSourceConstructor;
  private readonly getBearerToken?: () => string | null;
  private readonly listenersByOrder = new Map<string, Set<Listener>>();
  private source: Pick<EventSource, "close" | "onmessage"> | null = null;
  private readonly locallyPublishedKeys = new Set<string>();

  constructor(options: HttpOrderEventsOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? defaultApiBaseUrl());
    this.EventSourceImpl = options.EventSourceImpl ?? globalThis.EventSource;
    this.getBearerToken = options.getBearerToken;
  }

  subscribe(orderId: string, callback: Listener): Unsubscribe {
    const listeners = this.listenersByOrder.get(orderId) ?? new Set<Listener>();
    listeners.add(callback);
    this.listenersByOrder.set(orderId, listeners);
    this.ensureSource();

    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) this.listenersByOrder.delete(orderId);
      if (this.listenersByOrder.size === 0) {
        this.source?.close();
        this.source = null;
      }
    };
  }

  publish(event: OrderEvent): void {
    if (this.deliver(event)) this.locallyPublishedKeys.add(eventKey(event));
  }

  private ensureSource(): void {
    if (this.source || !this.EventSourceImpl) return;

    this.source = new this.EventSourceImpl(this.eventsUrl());
    this.source.onmessage = (message) => {
      const event = JSON.parse(message.data) as OrderEvent;
      if (this.locallyPublishedKeys.delete(eventKey(event))) return;
      this.deliver(event);
    };
  }

  private deliver(event: OrderEvent): boolean {
    const listeners = this.listenersByOrder.get(event.orderId);
    if (!listeners || listeners.size === 0) return false;

    for (const listener of listeners) listener(event);
    return true;
  }

  private eventsUrl(): string {
    const url = new URL(`${this.baseUrl}/ordering/events`);
    const token = this.getBearerToken?.();
    if (token) url.searchParams.set("access_token", token);
    return url.toString();
  }
}

function eventKey(event: OrderEvent): string {
  return `${event.orderId}:${event.type}:${event.version}`;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}
