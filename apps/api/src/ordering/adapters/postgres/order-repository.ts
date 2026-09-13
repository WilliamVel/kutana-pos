import { Inject, Injectable } from "@nestjs/common";
import type { Pool, PoolClient } from "pg";
import { ConflictError } from "@kutana/shared/errors/conflict-error.js";
import type { LineItem } from "@kutana/shared/ordering/model/line-item.js";
import type { Order } from "@kutana/shared/ordering/model/order.js";
import type { OrderRepository } from "@kutana/shared/ordering/ports/order-repository.js";
import { PostgresPool } from "../../../infrastructure/postgres/postgres-pool.js";

interface OrderRow {
  id: string;
  table_id: string;
  status: Order["status"];
  opened_at: Date | string;
  closed_at: Date | string | null;
  customer_id: string | null;
  version: number;
}

interface LineItemRow {
  id: string;
  order_id: string;
  product_id: string;
  name_snapshot: string;
  unit_price_cents: number;
  quantity: string | number;
  pour_size_ml: number | null;
  tax_rate_bp: number;
  tax_cents: number;
  total_cents: number;
  is_adjustment: boolean;
  created_at: Date | string;
}

const iso = (value: Date | string): string => value instanceof Date ? value.toISOString() : new Date(value).toISOString();
const lineItem = (row: LineItemRow): LineItem => ({
  id: row.id, orderId: row.order_id, productId: row.product_id, nameSnapshot: row.name_snapshot,
  unitPriceCents: row.unit_price_cents, quantity: Number(row.quantity), pourSizeMl: row.pour_size_ml,
  taxRateBp: row.tax_rate_bp, taxCents: row.tax_cents, totalCents: row.total_cents,
  isAdjustment: row.is_adjustment, createdAt: iso(row.created_at),
});

const sameLineItem = (left: LineItem, right: LineItem): boolean =>
  left.id === right.id && left.orderId === right.orderId && left.productId === right.productId &&
  left.nameSnapshot === right.nameSnapshot && left.unitPriceCents === right.unitPriceCents &&
  left.quantity === right.quantity && left.pourSizeMl === right.pourSizeMl && left.taxRateBp === right.taxRateBp &&
  left.taxCents === right.taxCents && left.totalCents === right.totalCents &&
  left.isAdjustment === right.isAdjustment && left.createdAt === right.createdAt;

const mapOrder = (row: OrderRow, items: LineItem[]): Order => ({
  id: row.id, tableId: row.table_id, status: row.status, lineItems: items,
  openedAt: iso(row.opened_at), closedAt: row.closed_at === null ? null : iso(row.closed_at),
  customerId: row.customer_id, version: row.version,
});

const selectItems = async (client: Pool | PoolClient, orderId: string): Promise<LineItem[]> => {
  const result = await client.query<LineItemRow>(
    "SELECT id, order_id, product_id, name_snapshot, unit_price_cents, quantity, pour_size_ml, tax_rate_bp, tax_cents, total_cents, is_adjustment, created_at FROM line_items WHERE order_id = $1 ORDER BY created_at, id",
    [orderId],
  );
  return result.rows.map(lineItem);
};

@Injectable()
export class PostgresOrderRepository implements OrderRepository {
  constructor(@Inject(PostgresPool) private readonly pool: Pool) {}

  async findByTable(tableId: string): Promise<Order | null> {
    const result = await this.pool.query<OrderRow>(
      "SELECT id, table_id, status, opened_at, closed_at, customer_id, version FROM orders WHERE table_id = $1 ORDER BY opened_at DESC, id DESC LIMIT 1",
      [tableId],
    );
    return result.rows[0] ? mapOrder(result.rows[0], await selectItems(this.pool, result.rows[0].id)) : null;
  }

  async listAll(): Promise<Order[]> {
    const result = await this.pool.query<OrderRow>(
      "SELECT id, table_id, status, opened_at, closed_at, customer_id, version FROM orders ORDER BY opened_at, id",
    );
    return Promise.all(result.rows.map(async (row) => mapOrder(row, await selectItems(this.pool, row.id))));
  }

  async save(order: Order, expectedVersion: number): Promise<Order> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query<OrderRow>(
        "SELECT id, table_id, status, opened_at, closed_at, customer_id, version FROM orders WHERE id = $1 FOR UPDATE",
        [order.id],
      );
      let saved: OrderRow;
      if (existing.rows[0]) {
        if (existing.rows[0].version !== expectedVersion) {
          throw new ConflictError<Order>(
            `Order ${order.id} version conflict: expected ${expectedVersion}, stored ${existing.rows[0].version}`,
            mapOrder(existing.rows[0], await selectItems(client, order.id)),
          );
        }
        const result = await client.query<OrderRow>(
          `UPDATE orders SET table_id = $1, status = $2, opened_at = $3, closed_at = $4, customer_id = $5, version = version + 1
           WHERE id = $6 RETURNING id, table_id, status, opened_at, closed_at, customer_id, version`,
          [order.tableId, order.status, order.openedAt, order.closedAt, order.customerId, order.id],
        );
        saved = result.rows[0]!;
        const storedItems = await selectItems(client, order.id);
        const storedItemsById = new Map(storedItems.map((item) => [item.id, item]));
        const nextItemIds = new Set(order.lineItems.map((item) => item.id));

        for (const item of order.lineItems) {
          if (item.orderId !== order.id) throw new Error(`Line item ${item.id} does not belong to order ${order.id}`);
          const stored = storedItemsById.get(item.id);
          if (stored) {
            if (!sameLineItem(item, stored)) {
              throw new Error(`Line items for order ${order.id} are immutable; remove or append instead of mutating`);
            }
            continue;
          }
          await insertLineItem(client, item);
        }

        for (const stored of storedItems) {
          if (!nextItemIds.has(stored.id)) {
            await client.query("DELETE FROM account_line_allocations WHERE line_item_id = $1", [stored.id]);
            await client.query("DELETE FROM allocations WHERE line_item_id = $1", [stored.id]);
            await client.query("DELETE FROM line_items WHERE id = $1 AND order_id = $2", [stored.id, order.id]);
          }
        }
      } else {
        const result = await client.query<OrderRow>(
          `INSERT INTO orders (id, table_id, status, opened_at, closed_at, customer_id, version)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, table_id, status, opened_at, closed_at, customer_id, version`,
          [order.id, order.tableId, order.status, order.openedAt, order.closedAt, order.customerId, expectedVersion + 1],
        );
        saved = result.rows[0]!;
        for (const item of order.lineItems) {
          if (item.orderId !== order.id) throw new Error(`Line item ${item.id} does not belong to order ${order.id}`);
          await insertLineItem(client, item);
        }
      }
      const items = await selectItems(client, order.id);
      await client.query("COMMIT");
      return mapOrder(saved, items);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteEmpty(orderId: string, expectedVersion: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query<OrderRow>(
        "SELECT id, table_id, status, opened_at, closed_at, customer_id, version FROM orders WHERE id = $1 FOR UPDATE",
        [orderId],
      );
      const order = existing.rows[0];
      if (!order) {
        await client.query("COMMIT");
        return;
      }
      if (order.version !== expectedVersion) {
        throw new ConflictError<Order>(
          `Order ${orderId} version conflict: expected ${expectedVersion}, stored ${order.version}`,
          mapOrder(order, await selectItems(client, orderId)),
        );
      }
      const items = await selectItems(client, orderId);
      if (items.length > 0) throw new Error(`Order ${orderId} is not empty`);
      const payments = await client.query(
        "SELECT 1 FROM payments WHERE ticket_id IN (SELECT id FROM tickets WHERE order_id = $1) LIMIT 1",
        [orderId],
      );
      if (payments.rows.length > 0) throw new Error(`Order ${orderId} has payments and cannot be removed`);

      await client.query("UPDATE restaurant_tables SET status = 'free', current_order_id = NULL, version = version + 1 WHERE current_order_id = $1", [orderId]);
      await client.query("DELETE FROM account_line_allocations WHERE account_id IN (SELECT id FROM personal_accounts WHERE order_id = $1)", [orderId]);
      await client.query("DELETE FROM personal_accounts WHERE order_id = $1", [orderId]);
      await client.query("DELETE FROM allocations WHERE ticket_id IN (SELECT id FROM tickets WHERE order_id = $1)", [orderId]);
      await client.query("DELETE FROM tickets WHERE order_id = $1", [orderId]);
      await client.query("DELETE FROM orders WHERE id = $1", [orderId]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

async function insertLineItem(client: PoolClient, item: LineItem): Promise<void> {
  await client.query(
    `INSERT INTO line_items (id, order_id, product_id, name_snapshot, unit_price_cents, quantity, pour_size_ml, tax_rate_bp, tax_cents, total_cents, is_adjustment, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [item.id, item.orderId, item.productId, item.nameSnapshot, item.unitPriceCents, item.quantity, item.pourSizeMl, item.taxRateBp, item.taxCents, item.totalCents, item.isAdjustment, item.createdAt],
  );
}
