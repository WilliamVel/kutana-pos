import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { ConflictError } from "@kutana/shared/errors/conflict-error.js";
import type { Table } from "@kutana/shared/ordering/model/table.js";
import type { TableRepository } from "@kutana/shared/ordering/ports/table-repository.js";
import { PostgresPool } from "../../../infrastructure/postgres/postgres-pool.js";

interface TableRow {
  id: string;
  label: string;
  status: Table["status"];
  current_order_id: string | null;
  version: number;
}

const mapTable = (row: TableRow): Table => ({
  id: row.id, label: row.label, status: row.status, currentOrderId: row.current_order_id, version: row.version,
});
const columns = "id, label, status, current_order_id, version";

@Injectable()
export class PostgresTableRepository implements TableRepository {
  constructor(@Inject(PostgresPool) private readonly pool: Pool) {}

  async listAll(): Promise<Table[]> {
    const result = await this.pool.query<TableRow>(`SELECT ${columns} FROM restaurant_tables ORDER BY label, id`);
    return result.rows.map(mapTable);
  }

  async findById(id: string): Promise<Table | null> {
    const result = await this.pool.query<TableRow>(`SELECT ${columns} FROM restaurant_tables WHERE id = $1`, [id]);
    return result.rows[0] ? mapTable(result.rows[0]) : null;
  }

  async save(table: Table, expectedVersion: number): Promise<Table> {
    const result = await this.pool.query<TableRow>(
      `INSERT INTO restaurant_tables (id, label, status, current_order_id, version)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, status = EXCLUDED.status,
         current_order_id = EXCLUDED.current_order_id, version = restaurant_tables.version + 1
       WHERE restaurant_tables.version = $6
       RETURNING ${columns}`,
      [table.id, table.label, table.status, table.currentOrderId, expectedVersion + 1, expectedVersion],
    );
    if (result.rows[0]) return mapTable(result.rows[0]);
    const current = await this.findById(table.id);
    if (!current) throw new Error(`Table ${table.id} could not be saved`);
    throw new ConflictError<Table>(
      `Table ${table.id} version conflict: expected ${expectedVersion}, stored ${current.version}`,
      current,
    );
  }

  async deleteFree(tableId: string, expectedVersion: number): Promise<void> {
    // Retire instead of deleting: historical orders keep their table FK.
    const result = await this.pool.query(
      `UPDATE restaurant_tables
       SET status = 'retired', version = version + 1
       WHERE id = $1 AND version = $2 AND status = 'free' AND current_order_id IS NULL`,
      [tableId, expectedVersion],
    );
    if (result.rowCount === 1) return;
    const current = await this.findById(tableId);
    if (!current) return;
    throw new ConflictError<Table>(
      `Table ${tableId} is not free or has a version conflict`,
      current,
    );
  }
}
