import type { Order } from "../model/order.js";

/**
 * Port contract only — the implementation lives in an adapter (mock in
 * `apps/web`, Postgres in `apps/api`, built in PR4+). `save` MUST throw
 * `ConflictError` (see `errors/conflict-error.ts`) when `expectedVersion`
 * no longer matches the stored aggregate's version, carrying the current
 * stored snapshot on the error so the caller never silently loses a write.
 */
export interface OrderRepository {
  findByTable(tableId: string): Promise<Order | null>;
  listAll(): Promise<Order[]>;
  /** Throws ConflictError<Order> if the stored version !== expectedVersion. */
  save(order: Order, expectedVersion: number): Promise<Order>;
  /** Removes an order only when it is empty; throws on version or payment conflicts. */
  deleteEmpty(orderId: string, expectedVersion: number): Promise<void>;
}
