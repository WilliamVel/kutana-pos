import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { createAllocation } from "@kutana/shared/billing/model/allocation.js";
import { createCustomer } from "@kutana/shared/billing/model/personal-account.js";
import { createTicket } from "@kutana/shared/billing/model/ticket.js";
import { runCustomerRepositoryContract } from "@kutana/shared/billing/ports/__contract__/customer-repository.contract.js";
import { runTicketRepositoryContract } from "@kutana/shared/billing/ports/__contract__/ticket-repository.contract.js";
import { postgresConfig } from "../../../infrastructure/postgres/postgres-config.js";
import { migrate } from "../../../persistence/migration-runner.js";
import { PostgresCustomerRepository } from "./customer-repository.js";
import { PostgresTicketRepository } from "./ticket-repository.js";

const databaseAvailable = Boolean(process.env.DATABASE_URL);
const migrationDirectory = join(process.cwd(), "migrations");
const productId = "00000000-0000-0000-0000-000000000001";

describe.skipIf(!databaseAvailable)("PostgreSQL billing adapters", () => {
  const pool = new Pool(postgresConfig());
  const customers = new PostgresCustomerRepository(pool);
  const tickets = new PostgresTicketRepository(pool);

  beforeAll(async () => migrate(pool, migrationDirectory));
  beforeEach(async () => {
    await pool.query("TRUNCATE payments, allocations, tickets, line_items, orders, customers, restaurant_tables, products, categories CASCADE");
    await pool.query(
      `INSERT INTO restaurant_tables (id, label, status, version) VALUES
        ('table-1', 'Table 1', 'free', 1),
        ('table-2', 'Table 2', 'free', 1),
        ('table-3', 'Table 3', 'free', 1),
        ('table-4', 'Table 4', 'free', 1)`,
    );
    await pool.query("INSERT INTO categories (id, name, sort_order) VALUES ('billing-category', 'Billing', 1)");
    await pool.query(
      `INSERT INTO products (id, sku, name, category_id, price_cents, tax_rate_bp, stock_kind, active, version)
       VALUES ($1, 'BILLING-COFFEE', 'Coffee', 'billing-category', 300, 1000, 'unit', true, 1)`,
      [productId],
    );
    await pool.query(
      `INSERT INTO orders (id, table_id, status, opened_at, version) VALUES
        ('order-1', 'table-1', 'active', '2025-01-01T00:00:00.000Z', 1),
        ('order-2', 'table-2', 'active', '2025-01-01T00:00:00.000Z', 1),
        ('order-3', 'table-3', 'active', '2025-01-01T00:00:00.000Z', 1),
        ('order-4', 'table-4', 'active', '2025-01-01T00:00:00.000Z', 1)`,
    );
    await pool.query(
      `INSERT INTO line_items (id, order_id, product_id, name_snapshot, unit_price_cents, quantity, pour_size_ml, tax_rate_bp, tax_cents, total_cents, is_adjustment, created_at)
       VALUES ('line-1', 'order-1', $1, 'Coffee', 300, 1, NULL, 1000, 30, 330, false, '2025-01-01T00:01:00.000Z')`,
      [productId],
    );
  });
  afterAll(async () => pool.end());

  runTicketRepositoryContract(() => tickets);
  runCustomerRepositoryContract(() => customers);

  it("round-trips non-UUID billing identifiers", async () => {
    const ticket = createTicket({ id: "ticket-string-id", orderId: "order-1", label: "String ticket" });
    const allocation = createAllocation({
      id: "alloc-string-id",
      lineItemId: "line-1",
      ticketId: ticket.id,
    });

    const saved = await tickets.save(ticket, [allocation], ticket.version);

    expect(saved.id).toBe("ticket-string-id");
    expect(await tickets.findById("ticket-string-id")).toEqual(saved);
    expect(await tickets.listAllocationsByOrder("order-1")).toEqual([allocation]);
  });

  it("round-trips non-UUID customer identifiers", async () => {
    const customer = createCustomer({
      id: "customer-string-id",
      displayName: "String Customer",
      now: "2025-01-02T00:00:00.000Z",
    });

    const saved = await customers.save(customer);

    expect(saved.id).toBe("customer-string-id");
    expect(await customers.findById("customer-string-id")).toEqual(saved);
  });
});

if (!databaseAvailable) console.info("Skipping PostgreSQL billing adapter tests: DATABASE_URL is unavailable");
