import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { createLineItem } from "@kutana/shared/ordering/model/line-item.js";
import { createOrder } from "@kutana/shared/ordering/model/order.js";
import { createTable } from "@kutana/shared/ordering/model/table.js";
import { runOrderRepositoryContract } from "@kutana/shared/ordering/ports/__contract__/order-repository.contract.js";
import { postgresConfig } from "../../../infrastructure/postgres/postgres-config.js";
import { migrate } from "../../../persistence/migration-runner.js";
import { PostgresOrderRepository } from "./order-repository.js";
import { PostgresTableRepository } from "./table-repository.js";

const databaseAvailable = Boolean(process.env.DATABASE_URL);
const migrationDirectory = existsSync(join(process.cwd(), "migrations"))
  ? join(process.cwd(), "migrations")
  : join(process.cwd(), "apps/api/migrations");

describe.skipIf(!databaseAvailable)("PostgreSQL ordering adapters", () => {
  const pool = new Pool(postgresConfig());
  const orders = new PostgresOrderRepository(pool);
  const tables = new PostgresTableRepository(pool);

  beforeAll(async () => migrate(pool, migrationDirectory));
  beforeEach(async () => {
    await pool.query("TRUNCATE orders, restaurant_tables, products, categories CASCADE");
    await pool.query(
      `INSERT INTO restaurant_tables (id, label, status, version) VALUES
        ('table-1', 'Table 1', 'free', 1), ('table-2', 'Table 2', 'free', 1),
        ('table-3', 'Table 3', 'free', 1), ('table-4', 'Table 4', 'free', 1),
        ('table-list-a', 'Table List A', 'free', 1), ('table-list-b', 'Table List B', 'free', 1)`,
    );
    await pool.query("INSERT INTO categories (id, name, sort_order) VALUES ('ordering-category', 'Ordering', 1)");
    await pool.query("INSERT INTO products (id, sku, name, category_id, price_cents, tax_rate_bp, stock_kind, active, version) VALUES ('00000000-0000-0000-0000-000000000001', 'ORDERING-COFFEE', 'Coffee', 'ordering-category', 300, 1000, 'unit', true, 1)");
  });
  afterAll(async () => pool.end());

  runOrderRepositoryContract(() => orders);

  it("round-trips line items and nullable order fields", async () => {
    const order = createOrder({ id: "order-with-items", tableId: "table-1", customerId: null, openedAt: "2025-01-01T00:00:00.000Z" });
    const saved = await orders.save({ ...order, lineItems: [createLineItem({
      id: "line-1", orderId: order.id, productId: "00000000-0000-0000-0000-000000000001", nameSnapshot: "Coffee",
      unitPriceCents: 300, quantity: 2, taxRateBp: 1000, createdAt: "2025-01-01T00:01:00.000Z",
    })] }, order.version);
    const found = await orders.findByTable("table-1");
    expect(found).toEqual({ ...saved, lineItems: [{ ...saved.lineItems[0], quantity: 2 }] });
    expect(found?.closedAt).toBeNull();
    expect(found?.customerId).toBeNull();
  });

  it("round-trips tables and currentOrderId", async () => {
    const table = createTable({ id: "table-round-trip", label: "Patio" });
    await pool.query("INSERT INTO restaurant_tables (id, label, status, version) VALUES ('table-round-trip', 'Patio', 'free', 1)");
    const order = createOrder({ id: "order-a", tableId: table.id });
    await orders.save(order, order.version);
    const saved = await tables.save({ ...table, currentOrderId: order.id, status: "active" }, table.version);
    expect(await tables.findById(table.id)).toEqual(saved);
    expect((await tables.listAll()).map((item) => item.id)).toContain(table.id);
  });

  it("rejects stale table writes with the current snapshot", async () => {
    const table = createTable({ id: "table-lock", label: "Lock" });
    const first = await tables.save(table, table.version);
    const winner = await tables.save({ ...first, label: "Winner" }, first.version);
    await expect(tables.save({ ...first, label: "Stale" }, first.version)).rejects.toMatchObject({
      currentSnapshot: winner,
    });
  });

  it("removes existing line items without mutating the remaining items", async () => {
    const order = createOrder({ id: "order-remove-line", tableId: "table-1" });
    const first = createLineItem({ id: "line-remove-first", orderId: order.id, productId: "00000000-0000-0000-0000-000000000001", nameSnapshot: "Coffee", unitPriceCents: 300, quantity: 1, taxRateBp: 0, createdAt: "2025-01-01T00:01:00.000Z" });
    const second = createLineItem({ id: "line-remove-second", orderId: order.id, productId: "00000000-0000-0000-0000-000000000001", nameSnapshot: "Coffee", unitPriceCents: 300, quantity: 1, taxRateBp: 0, createdAt: "2025-01-01T00:02:00.000Z" });
    const saved = await orders.save({ ...order, lineItems: [first, second] }, order.version);

    const afterRemoval = await orders.save({ ...saved, lineItems: [second] }, saved.version);

    expect(afterRemoval.lineItems).toEqual([second]);
  });

  it("does not mutate existing line items", async () => {
    const order = createOrder({ id: "order-immutable", tableId: "table-1" });
    const item = createLineItem({ id: "line-immutable", orderId: order.id, productId: "00000000-0000-0000-0000-000000000001", nameSnapshot: "Coffee", unitPriceCents: 300, quantity: 1, taxRateBp: 0 });
    const saved = await orders.save({ ...order, lineItems: [item] }, order.version);
    await expect(orders.save({ ...saved, lineItems: [{ ...item, quantity: 2 }] }, saved.version)).rejects.toThrow("immutable");
  });
});

if (!databaseAvailable) console.info("Skipping PostgreSQL ordering adapter tests: DATABASE_URL is unavailable");
