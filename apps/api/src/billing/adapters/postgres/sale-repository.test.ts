import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { createSale } from "@kutana/shared/billing/model/sale.js";
import { postgresConfig } from "../../../infrastructure/postgres/postgres-config.js";
import { migrate } from "../../../persistence/migration-runner.js";
import { PostgresSaleRepository } from "./sale-repository.js";

const databaseAvailable = Boolean(process.env.DATABASE_URL);
const migrationDirectory = existsSync(join(process.cwd(), "migrations"))
  ? join(process.cwd(), "migrations")
  : join(process.cwd(), "apps/api/migrations");

const tableId = "00000000-0000-0000-0000-000000000101";
const orderId = "00000000-0000-0000-0000-000000000102";
const saleId = "00000000-0000-0000-0000-000000000103";
const publicUuid = "00000000-0000-0000-0000-000000000104";

const snapshot = () =>
  createSale({
    id: saleId,
    publicUuid,
    orderId,
    completedAt: "2025-01-01T00:10:00.000Z",
    closedAt: "2025-01-01T00:10:00.000Z",
    tableId,
    subtotalCents: 1000,
    taxTotalCents: 100,
    discountTotalCents: 50,
    totalCents: 1050,
    paidCents: 500,
    pendingCents: 550,
    status: "pending",
    items: [
      {
        id: "00000000-0000-0000-0000-000000000105",
        saleId,
        orderLineItemId: "00000000-0000-0000-0000-000000000106",
        productId: "00000000-0000-0000-0000-000000000107",
        name: "Coffee",
        quantity: 2,
        unitPriceCents: 500,
        subtotalCents: 1000,
        taxCents: 100,
        discountCents: 50,
        totalCents: 1050,
      },
    ],
    settlements: [
      {
        id: "00000000-0000-0000-0000-000000000108",
        saleId,
        methodCode: "cash",
        amountCents: 500,
        tenderedCents: 600,
        changeCents: 100,
        settledAt: "2025-01-01T00:09:00.000Z",
      },
    ],
  });

describe.skipIf(!databaseAvailable)("PostgresSaleRepository", () => {
  const pool = new Pool(postgresConfig());
  const repository = new PostgresSaleRepository(pool);

  beforeAll(async () => migrate(pool, migrationDirectory));
  afterAll(async () => pool.end());
  beforeEach(async () => {
    await pool.query("TRUNCATE sales, restaurant_tables CASCADE");
    await pool.query(
      "INSERT INTO restaurant_tables (id, label, status, version) VALUES ($1, 'Sale test table', 'free', 1)",
      [tableId],
    );
    await pool.query(
      "INSERT INTO orders (id, table_id, status, opened_at, version) VALUES ($1, $2, 'active', $3, 1)",
      [orderId, tableId, "2025-01-01T00:00:00.000Z"],
    );
  });

  it("round-trips the complete immutable closure snapshot", async () => {
    const sale = snapshot();
    expect(await repository.create(sale)).toEqual(sale);
    expect(await repository.findByPublicUuid(publicUuid)).toEqual(sale);
    expect(await repository.findByOrderId(orderId)).toEqual(sale);
  });

  it("returns the existing snapshot only for an identical order retry", async () => {
    const sale = snapshot();
    await repository.create(sale);
    await expect(repository.create({ ...sale, totalCents: 1100 })).rejects.toThrow(
      /different snapshot/,
    );
    expect(await repository.findByOrderId(orderId)).toEqual(sale);
  });

  it("rejects mutation of sale history", async () => {
    const sale = snapshot();
    await repository.create(sale);
    await expect(pool.query("DELETE FROM sales WHERE id = $1", [saleId])).rejects.toThrow(
      /append-only/,
    );
  });
});

if (!databaseAvailable)
  console.info("Skipping PostgreSQL sale repository tests: DATABASE_URL is unavailable");
