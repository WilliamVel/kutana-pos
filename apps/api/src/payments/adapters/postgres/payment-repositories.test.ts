import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import type { PaymentMethodCode } from "@kutana/shared/payments/model/payment-method-registry.js";
import { runPaymentRepositoryContract } from "@kutana/shared/payments/ports/__contract__/payment-repository.contract.js";
import { postgresConfig } from "../../../infrastructure/postgres/postgres-config.js";
import { migrate } from "../../../persistence/migration-runner.js";
import { PostgresPaymentRepository } from "./payment-repository.js";

const databaseAvailable = Boolean(process.env.DATABASE_URL);
const migrationDirectory = existsSync(join(process.cwd(), "migrations"))
  ? join(process.cwd(), "migrations")
  : join(process.cwd(), "apps/api/migrations");
const fixtureMethod = "FIXTURE_METHOD" as PaymentMethodCode;
const productId = "00000000-0000-0000-0000-000000000001";

describe.skipIf(!databaseAvailable)("PostgreSQL payment adapter", () => {
  const pool = new Pool(postgresConfig());
  const payments = new PostgresPaymentRepository(pool);

  beforeAll(async () => migrate(pool, migrationDirectory));
  beforeEach(async () => seedPaymentFixtures(pool));
  afterAll(async () => pool.end());

  runPaymentRepositoryContract(() => payments);

  it("round-trips a non-UUID payment identifier", async () => {
    const recorded = await payments.record({
      id: "payment-string-id",
      target: { kind: "personal_account", accountId: "account-1" },
      methodCode: fixtureMethod,
      amountCents: 250,
      tenderedCents: 300,
      changeCents: 50,
      recordedAt: "2025-01-02T00:00:00.000Z",
    });

    expect(recorded.id).toBe("payment-string-id");
    expect(await payments.listByTarget({ kind: "personal_account", accountId: "account-1" })).toEqual([recorded]);
  });
});

async function seedPaymentFixtures(pool: Pool): Promise<void> {
  await pool.query(
    "TRUNCATE customer_debt_ledger, payments, account_line_allocations, personal_accounts, allocations, tickets, line_items, orders, customers, restaurant_tables, products, categories, payment_methods CASCADE",
  );
  await pool.query(
    `INSERT INTO payment_methods (code, label, requires_tendered, active, sort_order)
     VALUES ($1, 'Fixture Method', false, true, 1)`,
    [fixtureMethod],
  );
  await pool.query("INSERT INTO customers (id, display_name) VALUES ('customer-1', 'Fixture Customer')");
  await pool.query("INSERT INTO restaurant_tables (id, label, status, version) VALUES ('table-1', 'Table 1', 'free', 1)");
  await pool.query("INSERT INTO categories (id, name, sort_order) VALUES ('payment-category', 'Payments', 1)");
  await pool.query(
    `INSERT INTO products (id, sku, name, category_id, price_cents, tax_rate_bp, stock_kind, active, version)
     VALUES ($1, 'PAYMENT-FIXTURE', 'Payment Fixture', 'payment-category', 300, 1000, 'unit', true, 1)`,
    [productId],
  );
  await pool.query(
    `INSERT INTO orders (id, table_id, status, opened_at, version)
     VALUES ('order-1', 'table-1', 'active', '2025-01-01T00:00:00.000Z', 1)`,
  );
  await pool.query(
    `INSERT INTO line_items (id, order_id, product_id, name_snapshot, unit_price_cents, quantity, pour_size_ml, tax_rate_bp, tax_cents, total_cents, is_adjustment, created_at, position)
     VALUES ('line-1', 'order-1', $1, 'Payment Fixture', 300, 4, NULL, 1000, 120, 1320, false, '2025-01-01T00:01:00.000Z', 0)`,
    [productId],
  );
  await pool.query(
    "INSERT INTO tickets (id, order_id, label, status, version) VALUES ('ticket-1', 'order-1', 'Fixture Ticket', 'open', 1)",
  );
  await pool.query(
    `INSERT INTO personal_accounts (id, order_id, customer_id, free_name, status, created_at, version)
     VALUES ('account-1', 'order-1', NULL, 'Fixture Account', 'open', '2025-01-01T00:02:00.000Z', 1)`,
  );
  await pool.query(
    `INSERT INTO account_line_allocations (id, account_id, line_item_id, quantity)
     VALUES ('account-allocation-1', 'account-1', 'line-1', 4)`,
  );
  await pool.query(
    `INSERT INTO customer_debt_ledger
       (id, customer_id, kind, direction, amount_cents, account_id, payment_id, note, created_at)
     VALUES ('debt-1', 'customer-1', 'pending_account', 'debit', 1500, NULL, NULL, 'Fixture outstanding balance', '2025-01-01T00:03:00.000Z')`,
  );
}

if (!databaseAvailable) console.info("Skipping PostgreSQL payment adapter tests: DATABASE_URL is unavailable");
