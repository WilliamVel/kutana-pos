import { describe, expect, it } from "vitest";
import { ConflictError } from "../../errors/conflict-error.js";
import { createOrder, requestCheck } from "../model/order.js";
import type { OrderRepository } from "../ports/order-repository.js";

/**
 * This test exercises the PORT CONTRACT, not a concrete implementation
 * (the real implementation lives in an adapter, built in PR4). A minimal
 * in-memory stub is used here purely to prove the contract's shape and the
 * `ConflictError` behavior it must guarantee: a stale write is NEVER
 * silently overwritten, and the caller receives the current snapshot.
 */
class StubOrderRepository implements OrderRepository {
  private stored: Map<string, ReturnType<typeof createOrder>> = new Map();

  seed(order: ReturnType<typeof createOrder>): void {
    this.stored.set(order.id, order);
  }

  async findByTable(tableId: string) {
    for (const order of this.stored.values()) {
      if (order.tableId === tableId) return order;
    }
    return null;
  }

  async listAll() {
    return [...this.stored.values()];
  }

  async save(order: ReturnType<typeof createOrder>, expectedVersion: number) {
    const current = this.stored.get(order.id);
    if (!current || current.version !== expectedVersion) {
      throw new ConflictError("Order was modified concurrently", current ?? null);
    }
    this.stored.set(order.id, order);
    return order;
  }

  async deleteEmpty(orderId: string): Promise<void> {
    this.stored.delete(orderId);
  }
}

describe("OrderRepository.save — version-conflict port contract", () => {
  it("rejects a stale write when expectedVersion no longer matches the stored version", async () => {
    const repo = new StubOrderRepository();
    const original = createOrder({ tableId: "table-1" });
    repo.seed(original);

    // A concurrent writer advances the stored order to version 2 first.
    const advanced = requestCheck(original);
    await repo.save(advanced, original.version);

    // The second, now-stale writer still holds the order at version 1 and
    // attempts to save based on that stale expectedVersion.
    await expect(repo.save(original, original.version)).rejects.toBeInstanceOf(ConflictError);
  });

  it("never silently overwrites — the caller receives the current snapshot on conflict", async () => {
    const repo = new StubOrderRepository();
    const original = createOrder({ tableId: "table-1" });
    repo.seed(original);
    const advanced = await repo.save(requestCheck(original), original.version);

    try {
      await repo.save(original, original.version);
      throw new Error("expected save to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictError);
      expect((error as ConflictError).currentSnapshot).toEqual(advanced);
    }
  });

  it("accepts a write when expectedVersion matches the stored version", async () => {
    const repo = new StubOrderRepository();
    const original = createOrder({ tableId: "table-1" });
    repo.seed(original);
    const saved = await repo.save(requestCheck(original), original.version);
    expect(saved.status).toBe("needs_check");
  });
});
