import { ConflictError } from "@kutana/shared/errors/conflict-error.js";
import type { StockItem } from "@kutana/shared/inventory/model/stock-item.js";
import type { StockMovement } from "@kutana/shared/inventory/model/stock-movement.js";
import type { StockRepository } from "@kutana/shared/inventory/ports/stock-repository.js";
import { ConflictTrigger } from "./conflict-trigger.js";
import { simulateLatency } from "./simulate-latency.js";

/** In-memory `StockRepository` for milestone 1; the movement ledger is append-only. */
export class MockStockRepository implements StockRepository {
  private readonly itemsById = new Map<string, StockItem>();
  private readonly movementsByItem = new Map<string, StockMovement[]>();
  readonly conflictTrigger = new ConflictTrigger();

  async findById(id: string): Promise<StockItem | null> {
    return simulateLatency(() => this.itemsById.get(id) ?? null);
  }

  async listLowStock(): Promise<StockItem[]> {
    return simulateLatency(() =>
      [...this.itemsById.values()].filter(
        (item) => item.lowStockLevel !== null && item.quantity <= item.lowStockLevel,
      ),
    );
  }

  async listMovements(stockItemId: string): Promise<StockMovement[]> {
    return simulateLatency(() => [...(this.movementsByItem.get(stockItemId) ?? [])]);
  }

  async recordMovement(
    stockItem: StockItem,
    movement: StockMovement,
    expectedVersion: number,
  ): Promise<StockItem> {
    return simulateLatency(() => {
      const stored = this.itemsById.get(stockItem.id) ?? null;

      if (this.conflictTrigger.consumeForcedConflict()) {
        throw new ConflictError<StockItem>(
          "Forced conflict (test/demo trigger)",
          stored ?? stockItem,
        );
      }

      if (stored && stored.version !== expectedVersion) {
        throw new ConflictError<StockItem>(
          `StockItem ${stockItem.id} version conflict: expected ${expectedVersion}, stored ${stored.version}`,
          stored,
        );
      }

      const next: StockItem = { ...stockItem, version: expectedVersion + 1 };
      this.itemsById.set(stockItem.id, next);
      const existingMovements = this.movementsByItem.get(stockItem.id) ?? [];
      this.movementsByItem.set(stockItem.id, [...existingMovements, movement]);
      return next;
    });
  }
}
