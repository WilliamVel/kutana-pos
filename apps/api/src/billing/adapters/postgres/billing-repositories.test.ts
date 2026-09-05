import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { createAllocation } from "@kutana/shared/billing/model/allocation.js";
import { createCustomerDebtEntry } from "@kutana/shared/billing/model/customer-debt-ledger.js";
import {
  createAccountLineAllocation,
  createCustomer,
  createPersonalAccount,
} from "@kutana/shared/billing/model/personal-account.js";
import { createTicket } from "@kutana/shared/billing/model/ticket.js";
import { runCustomerDebtRepositoryContract } from "@kutana/shared/billing/ports/__contract__/customer-debt-repository.contract.js";
import { runCustomerRepositoryContract } from "@kutana/shared/billing/ports/__contract__/customer-repository.contract.js";
import { runPersonalAccountRepositoryContract } from "@kutana/shared/billing/ports/__contract__/personal-account-repository.contract.js";
import { runTicketRepositoryContract } from "@kutana/shared/billing/ports/__contract__/ticket-repository.contract.js";
import { postgresConfig } from "../../../infrastructure/postgres/postgres-config.js";
import { migrate } from "../../../persistence/migration-runner.js";
import { PostgresCustomerDebtRepository } from "./customer-debt-repository.js";
import { PostgresCustomerRepository } from "./customer-repository.js";
import { PostgresPersonalAccountRepository } from "./personal-account-repository.js";
import { PostgresTicketRepository } from "./ticket-repository.js";

const databaseAvailable = Boolean(process.env.DATABASE_URL);
const migrationDirectory = existsSync(join(process.cwd(), "migrations"))
  ? join(process.cwd(), "migrations")
  : join(process.cwd(), "apps/api/migrations");
const productId = "00000000-0000-0000-0000-000000000001";

const orderIds = [
  "order-1",
  "order-2",
  "order-3",
  "order-4",
  "order-other",
  "order-5",
  "order-delete",
  "order-delete-conflict",
];

describe.skipIf(!databaseAvailable)("PostgreSQL billing adapters", () => {
  const pool = new Pool(postgresConfig());
  const customers = new PostgresCustomerRepository(pool);
  const customerDebts = new PostgresCustomerDebtRepository(pool);
  const personalAccounts = new PostgresPersonalAccountRepository(pool);
  const tickets = new PostgresTicketRepository(pool);

  beforeAll(async () => migrate(pool, migrationDirectory));
  afterAll(async () => pool.end());

  async function resetBillingFixtures(seedCustomer = false): Promise<void> {
    await pool.query(
      "TRUNCATE customer_debt_ledger, payments, account_line_allocations, personal_accounts, allocations, tickets, line_items, orders, customers, restaurant_tables, products, categories CASCADE",
    );
    await pool.query(
      `INSERT INTO restaurant_tables (id, label, status, version) VALUES
        ('table-1', 'Table 1', 'free', 1),
        ('table-2', 'Table 2', 'free', 1),
        ('table-3', 'Table 3', 'free', 1),
        ('table-4', 'Table 4', 'free', 1),
        ('table-5', 'Table 5', 'free', 1),
        ('table-6', 'Table 6', 'free', 1),
        ('table-7', 'Table 7', 'free', 1),
        ('table-8', 'Table 8', 'free', 1)`,
    );
    await pool.query("INSERT INTO categories (id, name, sort_order) VALUES ('billing-category', 'Billing', 1)");
    await pool.query(
      `INSERT INTO products (id, sku, name, category_id, price_cents, tax_rate_bp, stock_kind, active, version)
       VALUES ($1, 'BILLING-COFFEE', 'Coffee', 'billing-category', 300, 1000, 'unit', true, 1)`,
      [productId],
    );
    await pool.query(
      `INSERT INTO orders (id, table_id, status, opened_at, version)
       SELECT order_id, 'table-' || ordinal::text, 'active', '2025-01-01T00:00:00.000Z', 1
       FROM unnest($1::text[]) WITH ORDINALITY AS fixture(order_id, ordinal)`,
      [orderIds],
    );
    await pool.query(
      `INSERT INTO line_items (id, order_id, product_id, name_snapshot, unit_price_cents, quantity, pour_size_ml, tax_rate_bp, tax_cents, total_cents, is_adjustment, created_at)
       VALUES
        ('line-1', 'order-1', $1, 'Coffee', 300, 2, NULL, 1000, 60, 660, false, '2025-01-01T00:01:00.000Z'),
        ('line-delete', 'order-delete', $1, 'Coffee', 300, 1, NULL, 1000, 30, 330, false, '2025-01-01T00:02:00.000Z')`,
      [productId],
    );
    if (seedCustomer) {
      await customers.save(
        createCustomer({ id: "customer-1", displayName: "Ana", now: "2025-01-01T00:00:00.000Z" }),
      );
    }
  }

  async function seedCustomerDebtContractCustomers(): Promise<void> {
    await customers.save(
      createCustomer({ id: "customer-1", displayName: "Ana", now: "2025-01-01T00:00:00.000Z" }),
    );
    await customers.save(
      createCustomer({ id: "customer-a", displayName: "Customer A", now: "2025-01-01T00:01:00.000Z" }),
    );
    await customers.save(
      createCustomer({ id: "customer-b", displayName: "Customer B", now: "2025-01-01T00:02:00.000Z" }),
    );
    await customers.save(
      createCustomer({ id: "customer-empty", displayName: "Empty Customer", now: "2025-01-01T00:03:00.000Z" }),
    );
  }

  describe("tickets", () => {
    beforeEach(async () => resetBillingFixtures());

    runTicketRepositoryContract(() => tickets);

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
  });

  describe("customers", () => {
    beforeEach(async () => resetBillingFixtures());

    runCustomerRepositoryContract(() => customers);

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

  describe("customer debts", () => {
    beforeEach(async () => {
      await resetBillingFixtures();
      await seedCustomerDebtContractCustomers();
    });

    runCustomerDebtRepositoryContract(() => customerDebts);

    it("round-trips non-UUID debt identifiers and explicit references", async () => {
      const entry = createCustomerDebtEntry({
        id: "debt-string-id",
        customerId: "customer-1",
        kind: "adjustment",
        direction: "credit",
        amountCents: 125,
        accountId: "account-string-id",
        paymentId: "payment-string-id",
        note: "Manual correction",
        createdAt: "2025-01-02T00:00:00.000Z",
      });

      const saved = await customerDebts.record(entry);

      expect(saved).toEqual(entry);
      expect(await customerDebts.listByCustomer("customer-1")).toEqual([entry]);
      expect(await customerDebts.listAll()).toEqual([entry]);
    });
  });

  describe("personal accounts", () => {
    beforeEach(async () => resetBillingFixtures(true));

    runPersonalAccountRepositoryContract(() => personalAccounts);

    it("round-trips non-UUID personal account and allocation identifiers", async () => {
      const account = createPersonalAccount({
        id: "personal-account-string-id",
        orderId: "order-1",
        freeName: "String account",
        createdAt: "2025-01-02T00:00:00.000Z",
      });
      const allocation = createAccountLineAllocation({
        id: "account-allocation-string-id",
        accountId: account.id,
        lineItemId: "line-1",
        quantity: 1,
      });

      const saved = await personalAccounts.save(account, [allocation], account.version);

      expect(saved.id).toBe("personal-account-string-id");
      expect(await personalAccounts.findById("personal-account-string-id")).toEqual(saved);
      expect(await personalAccounts.listAllocationsByOrder("order-1")).toEqual([allocation]);
    });
  });
});

if (!databaseAvailable) console.info("Skipping PostgreSQL billing adapter tests: DATABASE_URL is unavailable");
