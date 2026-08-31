import { ConflictError } from "@kutana/shared/errors/conflict-error.js";
import type { Order } from "@kutana/shared/ordering/model/order.js";
import type { OrderRepository } from "@kutana/shared/ordering/ports/order-repository.js";
import { ConflictTrigger } from "./conflict-trigger.js";
import { simulateLatency } from "./simulate-latency.js";

/**
 * In-memory `OrderRepository` for milestone 1. Keyed by tableId to match
 * `findByTable`'s access pattern (mirrors the design's partial index on
 * `orders(table_id) WHERE closed_at IS NULL`).
 */
export class MockOrderRepository implements OrderRepository {
  private readonly ordersByTable = new Map<string, Order>();
  readonly conflictTrigger = new ConflictTrigger();

  async findByTable(tableId: string): Promise<Order | null> {
    return simulateLatency(() => this.ordersByTable.get(tableId) ?? null);
  }

  async listAll(): Promise<Order[]> {
    return simulateLatency(() => [...this.ordersByTable.values()]);
  }

  async save(order: Order, expectedVersion: number): Promise<Order> {
    return simulateLatency(() => {
      const stored = this.ordersByTable.get(order.tableId) ?? null;

      if (this.conflictTrigger.consumeForcedConflict()) {
        throw new ConflictError<Order>("Forced conflict (test/demo trigger)", stored ?? order);
      }

      if (stored && stored.version !== expectedVersion) {
        throw new ConflictError<Order>(
          `Order ${order.id} version conflict: expected ${expectedVersion}, stored ${stored.version}`,
          stored,
        );
      }

      const next: Order = { ...order, version: expectedVersion + 1 };
      this.ordersByTable.set(order.tableId, next);
      return next;
    });
  }
}
