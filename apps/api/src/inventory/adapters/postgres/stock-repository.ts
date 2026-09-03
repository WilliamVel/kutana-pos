import { Inject, Injectable } from "@nestjs/common";
import type { Pool, PoolClient } from "pg";
import { ConflictError } from "@kutana/shared/errors/conflict-error.js";
import type { StockItem } from "@kutana/shared/inventory/model/stock-item.js";
import type { StockMovement } from "@kutana/shared/inventory/model/stock-movement.js";
import type { StockRepository } from "@kutana/shared/inventory/ports/stock-repository.js";
import { PostgresPool } from "../../../infrastructure/postgres/postgres-pool.js";

interface StockItemRow {
  id: string;
  name: string;
  kind: StockItem["kind"];
  unit: StockItem["unit"];
  quantity: string | number;
  low_stock_level: string | number | null;
  version: number;
}

interface StockMovementRow {
  id: string;
  stock_item_id: string;
  delta: string | number;
  reason: string;
  ref_type: string;
  ref_id: string;
  occurred_at: Date | string;
}

const numberValue = (value: string | number): number => Number(value);
const nullableNumber = (value: string | number | null): number | null => value === null ? null : Number(value);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const mapItem = (row: StockItemRow): StockItem => ({
  id: row.id,
  name: row.name,
  kind: row.kind,
  unit: row.unit,
  quantity: numberValue(row.quantity),
  lowStockLevel: nullableNumber(row.low_stock_level),
  version: row.version,
});

const mapMovement = (row: StockMovementRow): StockMovement => ({
  id: row.id,
  stockItemId: row.stock_item_id,
  delta: numberValue(row.delta),
  reason: row.reason,
  refType: row.ref_type,
  refId: row.ref_id,
  occurredAt: row.occurred_at instanceof Date ? row.occurred_at.toISOString() : new Date(row.occurred_at).toISOString(),
});

@Injectable()
export class PostgresStockRepository implements StockRepository {
  constructor(@Inject(PostgresPool) private readonly pool: Pool) {}

  async findById(id: string): Promise<StockItem | null> {
    if (!UUID_PATTERN.test(id)) return null;
    const result = await this.pool.query<StockItemRow>("SELECT * FROM stock_items WHERE id = $1", [id]);
    return result.rows[0] ? mapItem(result.rows[0]) : null;
  }

  async listLowStock(): Promise<StockItem[]> {
    const result = await this.pool.query<StockItemRow>(
      "SELECT * FROM stock_items WHERE low_stock_level IS NOT NULL AND quantity <= low_stock_level ORDER BY id",
    );
    return result.rows.map(mapItem);
  }

  async listMovements(stockItemId: string): Promise<StockMovement[]> {
    const result = await this.pool.query<StockMovementRow>(
      "SELECT * FROM stock_movements WHERE stock_item_id = $1 ORDER BY occurred_at, id",
      [stockItemId],
    );
    return result.rows.map(mapMovement);
  }

  async recordMovement(stockItem: StockItem, movement: StockMovement, expectedVersion: number): Promise<StockItem> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const updated = await client.query<StockItemRow>(
        `UPDATE stock_items SET name = $1, kind = $2, unit = $3, quantity = $4, low_stock_level = $5, version = version + 1
         WHERE id = $6 AND version = $7 RETURNING *`,
        [stockItem.name, stockItem.kind, stockItem.unit, stockItem.quantity, stockItem.lowStockLevel, stockItem.id, expectedVersion],
      );
      let saved: StockItem;
      if (updated.rows[0]) {
        saved = mapItem(updated.rows[0]);
      } else {
        const current = await client.query<StockItemRow>("SELECT * FROM stock_items WHERE id = $1 FOR UPDATE", [stockItem.id]);
        if (current.rows[0]) {
          throw new ConflictError<StockItem>(
            `StockItem ${stockItem.id} version conflict: expected ${expectedVersion}, stored ${current.rows[0].version}`,
            mapItem(current.rows[0]),
          );
        }
        const inserted = await client.query<StockItemRow>(
          `INSERT INTO stock_items (id, name, kind, unit, quantity, low_stock_level, version)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [stockItem.id, stockItem.name, stockItem.kind, stockItem.unit, stockItem.quantity, stockItem.lowStockLevel, expectedVersion + 1],
        );
        const row = inserted.rows[0];
        if (!row) throw new Error(`StockItem ${stockItem.id} was not returned after insert`);
        saved = mapItem(row);
      }
      await client.query(
        `INSERT INTO stock_movements (id, stock_item_id, delta, reason, ref_type, ref_id, occurred_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [movement.id, movement.stockItemId, movement.delta, movement.reason, movement.refType, movement.refId, movement.occurredAt],
      );
      await client.query("COMMIT");
      return saved;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
