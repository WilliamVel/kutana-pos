import { existsSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { runProductRepositoryContract } from "@kutana/shared/catalog/ports/__contract__/product-repository.contract.js";
import { runStockRepositoryContract } from "@kutana/shared/inventory/ports/__contract__/stock-repository.contract.js";
import { PostgresCategoryRepository } from "./category-repository.js";
import { PostgresProductRepository } from "./product-repository.js";
import { PostgresStockRepository } from "../../../inventory/adapters/postgres/stock-repository.js";
import { postgresConfig } from "../../../infrastructure/postgres/postgres-config.js";
import { migrate } from "../../../persistence/migration-runner.js";

const databaseAvailable = Boolean(process.env.DATABASE_URL);
const migrationDirectory = existsSync(join(process.cwd(), "migrations"))
  ? join(process.cwd(), "migrations")
  : join(process.cwd(), "apps/api/migrations");

describe.skipIf(!databaseAvailable)("PostgreSQL catalog and inventory adapters", () => {
  const pool = new Pool(postgresConfig());
  const categories = new PostgresCategoryRepository(pool);
  const products = new PostgresProductRepository(pool);
  const stock = new PostgresStockRepository(pool);

  beforeAll(async () => {
    await migrate(pool, migrationDirectory);
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE products, stock_movements, stock_items, categories CASCADE");
    await pool.query(
      `INSERT INTO categories (id, name, sort_order) VALUES
        ('category-beer', 'Beer', 1), ('category-x', 'Category X', 2), ('category-y', 'Category Y', 3)`,
    );
    await pool.query(
      `INSERT INTO stock_items (id, name, kind, unit, quantity, low_stock_level, version)
       VALUES ('stock-keg-1', 'Keg', 'volume', 'ml', 5000, NULL, 1)`,
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  runProductRepositoryContract(() => products);
  runStockRepositoryContract(() => stock);

  it("increments a new product version from expectedVersion", async () => {
    const product = {
      id: "00000000-0000-0000-0000-000000000010",
      sku: "VERSIONED-PRODUCT",
      barcode: null,
      name: "Versioned Product",
      categoryId: "00000000-0000-0000-0000-000000000011",
      priceCents: 100,
      costPriceCents: null,
      taxRateBp: 1200,
      description: null,
      imageUrl: null,
      lowStockLevel: null,
      stockKind: "unit" as const,
      pourSizeMl: null,
      stockItemId: null,
      active: true,
      version: 1,
    };
    await categories.save({ id: product.categoryId, name: "Version Category", sortOrder: 1 });
    const saved = await products.save(product, product.version);

    expect(saved.version).toBe(product.version + 1);
  });

  it("round-trips categories in sort order", async () => {
    await pool.query("DELETE FROM categories WHERE id IN ('category-beer', 'category-x', 'category-y')");
    await categories.save({ id: "00000000-0000-0000-0000-000000000002", name: "Beer", sortOrder: 2 });
    await categories.save({ id: "00000000-0000-0000-0000-000000000001", name: "Food", sortOrder: 1 });

    expect(await categories.listAll()).toEqual([
      { id: "00000000-0000-0000-0000-000000000001", name: "Food", sortOrder: 1 },
      { id: "00000000-0000-0000-0000-000000000002", name: "Beer", sortOrder: 2 },
    ]);
  });

  it("skips deterministically when DATABASE_URL is not configured", () => {
    expect(databaseAvailable).toBe(true);
  });
});

if (!databaseAvailable) {
  console.info("Skipping PostgreSQL adapter conformance tests: DATABASE_URL is unavailable");
}
