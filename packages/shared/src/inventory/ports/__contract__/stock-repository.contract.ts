import { describe, expect, it } from "vitest";
import { ConflictError } from "../../../errors/conflict-error.js";
import { createStockItem, type StockItem } from "../../model/stock-item.js";
import { createStockMovement } from "../../model/stock-movement.js";
import type { StockRepository } from "../stock-repository.js";

/**
 * Implementation-agnostic conformance suite for `StockRepository`.
 */
export function runStockRepositoryContract(
  createRepository: () => StockRepository | Promise<StockRepository>,
): void {
  describe("StockRepository contract", () => {
    it("returns null from findById when no stock item exists", async () => {
      const repository = await createRepository();
      expect(await repository.findById("does-not-exist")).toBeNull();
    });

    it("records a movement, updating the stock item and appending to the ledger atomically", async () => {
      const repository = await createRepository();
      const keg = createStockItem({ name: "Keg", kind: "volume", unit: "ml", quantity: 5000 });
      await repository.recordMovement(
        keg,
        createStockMovement({
          stockItemId: keg.id,
          delta: 0,
          reason: "restock",
          refType: "seed",
          refId: "seed-1",
        }),
        keg.version,
      );

      const updated = { ...keg, quantity: 4500, version: keg.version + 1 };
      await repository.recordMovement(
        updated,
        createStockMovement({
          stockItemId: keg.id,
          delta: -500,
          reason: "sale",
          refType: "line_item",
          refId: "line-1",
        }),
        keg.version + 1,
      );

      const found = await repository.findById(keg.id);
      expect(found?.quantity).toBe(4500);

      const movements = await repository.listMovements(keg.id);
      expect(movements).toHaveLength(2);
      const total = movements.reduce((sum, movement) => sum + movement.delta, 0);
      expect(total).toBe(-500);
    });

    it("lists items at or below their configured low-stock threshold", async () => {
      const repository = await createRepository();
      const low = createStockItem({
        name: "Low Item",
        kind: "unit",
        unit: "ea",
        quantity: 2,
        lowStockLevel: 5,
      });
      const healthy = createStockItem({
        name: "Healthy Item",
        kind: "unit",
        unit: "ea",
        quantity: 20,
        lowStockLevel: 5,
      });

      await repository.recordMovement(
        low,
        createStockMovement({
          stockItemId: low.id,
          delta: 0,
          reason: "restock",
          refType: "seed",
          refId: "seed-2",
        }),
        low.version,
      );
      await repository.recordMovement(
        healthy,
        createStockMovement({
          stockItemId: healthy.id,
          delta: 0,
          reason: "restock",
          refType: "seed",
          refId: "seed-3",
        }),
        healthy.version,
      );

      const lowStock = await repository.listLowStock();
      const ids = lowStock.map((item) => item.id);
      expect(ids).toContain(low.id);
      expect(ids).not.toContain(healthy.id);
    });

    it("throws ConflictError when expectedVersion no longer matches the stored version", async () => {
      const repository = await createRepository();
      const item = createStockItem({
        name: "Conflict Item",
        kind: "unit",
        unit: "ea",
        quantity: 10,
      });
      const firstMovement = await repository.recordMovement(
        item,
        createStockMovement({
          stockItemId: item.id,
          delta: 0,
          reason: "restock",
          refType: "seed",
          refId: "seed-4",
        }),
        item.version,
      );

      await repository.recordMovement(
        { ...firstMovement, quantity: 9 },
        createStockMovement({
          stockItemId: item.id,
          delta: -1,
          reason: "sale",
          refType: "line_item",
          refId: "line-2",
        }),
        firstMovement.version,
      );

      const staleWrite = repository.recordMovement(
        { ...firstMovement, quantity: 8 },
        createStockMovement({
          stockItemId: item.id,
          delta: -1,
          reason: "sale",
          refType: "line_item",
          refId: "line-3",
        }),
        firstMovement.version,
      );

      await expect(staleWrite).rejects.toBeInstanceOf(ConflictError);
    });

    it("carries the current stored snapshot on ConflictError", async () => {
      const repository = await createRepository();
      const item = createStockItem({
        name: "Conflict Item 2",
        kind: "unit",
        unit: "ea",
        quantity: 10,
      });
      const firstMovement = await repository.recordMovement(
        item,
        createStockMovement({
          stockItemId: item.id,
          delta: 0,
          reason: "restock",
          refType: "seed",
          refId: "seed-5",
        }),
        item.version,
      );

      const winner = await repository.recordMovement(
        { ...firstMovement, quantity: 9 },
        createStockMovement({
          stockItemId: item.id,
          delta: -1,
          reason: "sale",
          refType: "line_item",
          refId: "line-4",
        }),
        firstMovement.version,
      );

      try {
        await repository.recordMovement(
          { ...firstMovement, quantity: 8 },
          createStockMovement({
            stockItemId: item.id,
            delta: -1,
            reason: "sale",
            refType: "line_item",
            refId: "line-5",
          }),
          firstMovement.version,
        );
        expect.unreachable("expected a stale movement to throw ConflictError");
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictError);
        const conflict = error as ConflictError<StockItem>;
        expect(conflict.currentSnapshot.quantity).toBe(winner.quantity);
        expect(conflict.currentSnapshot.version).toBe(winner.version);
      }
    });
  });
}
