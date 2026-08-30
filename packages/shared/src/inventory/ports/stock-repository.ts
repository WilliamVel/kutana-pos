import type { StockItem } from "../model/stock-item.js";
import type { StockMovement } from "../model/stock-movement.js";

/** Port contract only — implementations live in adapters (mock/HTTP/Postgres). */
export interface StockRepository {
  findById(id: string): Promise<StockItem | null>;
  listLowStock(): Promise<StockItem[]>;
  listMovements(stockItemId: string): Promise<StockMovement[]>;
  /**
   * Persists both the updated StockItem and the new append-only StockMovement
   * atomically. Throws ConflictError<StockItem> if the stored version !== expectedVersion.
   */
  recordMovement(
    stockItem: StockItem,
    movement: StockMovement,
    expectedVersion: number,
  ): Promise<StockItem>;
}
