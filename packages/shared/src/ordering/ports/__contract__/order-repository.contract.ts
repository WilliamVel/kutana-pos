import { describe, expect, it } from "vitest";
import { ConflictError } from "../../../errors/conflict-error.js";
import { createOrder, type Order } from "../../model/order.js";
import type { OrderRepository } from "../order-repository.js";

/**
 * Implementation-agnostic conformance suite for `OrderRepository`.
 *
 * This suite asserts PORT SEMANTICS ONLY: return-value shapes, null-vs-found
 * behavior, and the version-conflict contract. It must never assume object
 * identity, insertion order, synchronous execution, or any other detail
 * that a real Postgres-backed implementation would not also satisfy.
 *
 * Run this exact suite, unmodified, against the mock adapter in
 * `apps/web/src/adapters/mock/` today and against the Postgres adapter in
 * `apps/api/**\/persistence/` at milestone 2 — that is the whole point.
 */
export function runOrderRepositoryContract(
  createRepository: () => OrderRepository | Promise<OrderRepository>,
): void {
  describe("OrderRepository contract", () => {
    it("returns null from findByTable when no order exists for the table", async () => {
      const repository = await createRepository();
      const found = await repository.findByTable("table-does-not-exist");
      expect(found).toBeNull();
    });

    it("saves a new order and reads it back by table with equal data", async () => {
      const repository = await createRepository();
      const order = createOrder({ tableId: "table-1" });

      const saved = await repository.save(order, order.version);
      expect(saved.id).toBe(order.id);
      expect(saved.tableId).toBe("table-1");

      const found = await repository.findByTable("table-1");
      expect(found).not.toBeNull();
      expect(found?.id).toBe(order.id);
      expect(found?.version).toBe(saved.version);
      expect(found?.status).toBe(order.status);
    });

    it("lists all saved orders", async () => {
      const repository = await createRepository();
      const orderA = createOrder({ id: "order-a", tableId: "table-list-a" });
      const orderB = createOrder({ id: "order-b", tableId: "table-list-b" });

      await repository.save(orderB, orderB.version);
      await repository.save(orderA, orderA.version);

      const orders = await repository.listAll();
      expect(orders.map((order) => order.id).sort()).toEqual(["order-a", "order-b"]);
    });

    it("accepts a save whose expectedVersion matches the stored version and advances it", async () => {
      const repository = await createRepository();
      const order = createOrder({ tableId: "table-2" });
      const firstSave = await repository.save(order, order.version);

      const updated: Order = { ...firstSave, status: "needs_check" };
      const secondSave = await repository.save(updated, firstSave.version);

      expect(secondSave.status).toBe("needs_check");
      expect(secondSave.version).toBeGreaterThan(firstSave.version);
    });

    it("throws ConflictError when expectedVersion no longer matches the stored version", async () => {
      const repository = await createRepository();
      const order = createOrder({ tableId: "table-3" });
      const firstSave = await repository.save(order, order.version);

      // Advance the stored version out from under the caller.
      await repository.save({ ...firstSave, status: "needs_check" }, firstSave.version);

      const staleWrite = repository.save(
        { ...firstSave, status: "needs_check" },
        firstSave.version,
      );

      await expect(staleWrite).rejects.toBeInstanceOf(ConflictError);
    });

    it("carries the current stored snapshot on the thrown ConflictError, never dropping the write silently", async () => {
      const repository = await createRepository();
      const order = createOrder({ tableId: "table-4" });
      const firstSave = await repository.save(order, order.version);
      const winner = await repository.save(
        { ...firstSave, status: "needs_check" },
        firstSave.version,
      );

      try {
        await repository.save({ ...firstSave, status: "needs_check" }, firstSave.version);
        expect.unreachable("expected a stale save to throw ConflictError");
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictError);
        const conflict = error as ConflictError<Order>;
        expect(conflict.currentSnapshot.version).toBe(winner.version);
        expect(conflict.currentSnapshot.status).toBe(winner.status);
      }
    });
  });
}
