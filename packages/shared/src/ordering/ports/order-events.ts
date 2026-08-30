import type { Order } from "../model/order.js";

export type OrderEventType = "order.updated" | "order.closed" | "ticket.paid";

/**
 * Full-snapshot realtime event, published only AFTER the triggering write
 * commits — never inside a transaction, so no subscriber ever observes a
 * rolled-back state. Payload is the complete order snapshot, not a delta.
 */
export interface OrderEvent {
  readonly type: OrderEventType;
  readonly orderId: string;
  readonly tableId: string;
  /** Aggregate version AFTER the change. */
  readonly version: number;
  readonly at: string;
  readonly payload: Order;
}

export type Unsubscribe = () => void;

/**
 * Port contract only — the mock implementation (`apps/web`) is an
 * in-process EventEmitter; the HTTP implementation is a WebSocket
 * subscription. Both satisfy this exact same interface, which is the
 * mechanism that lets the realtime UI be fully built before any backend
 * exists (see design.md "Realtime Design").
 */
export interface OrderEvents {
  subscribe(orderId: string, callback: (event: OrderEvent) => void): Unsubscribe;
  publish(event: OrderEvent): void;
}
