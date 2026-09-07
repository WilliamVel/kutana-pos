import { Pool } from "pg";
import {
  KUTANA_MENU_CATEGORIES,
  KUTANA_MENU_PRODUCTS,
} from "@kutana/shared/catalog/model/kutana-menu.seed.js";
import { postgresConfig } from "../infrastructure/postgres/postgres-config.js";

const pool = new Pool(postgresConfig());

async function seed(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const category of KUTANA_MENU_CATEGORIES) {
      await client.query(
        `INSERT INTO categories (id, name, sort_order)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           sort_order = EXCLUDED.sort_order`,
        [category.id, category.name, category.sortOrder],
      );
    }

    for (const product of KUTANA_MENU_PRODUCTS) {
      await client.query(
        `INSERT INTO products
          (id, sku, barcode, name, category_id, price_cents, cost_price_cents, tax_rate_bp, description, image_url,
           low_stock_level, stock_kind, pour_size_ml, stock_item_id, active, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 1)
         ON CONFLICT (sku) DO UPDATE SET
           barcode = EXCLUDED.barcode,
           name = EXCLUDED.name,
           category_id = EXCLUDED.category_id,
           price_cents = EXCLUDED.price_cents,
           cost_price_cents = EXCLUDED.cost_price_cents,
           tax_rate_bp = EXCLUDED.tax_rate_bp,
           description = EXCLUDED.description,
           image_url = EXCLUDED.image_url,
           low_stock_level = EXCLUDED.low_stock_level,
           stock_kind = EXCLUDED.stock_kind,
           pour_size_ml = EXCLUDED.pour_size_ml,
           stock_item_id = EXCLUDED.stock_item_id,
           active = EXCLUDED.active`,
        [
          product.id,
          product.sku,
          product.barcode,
          product.name,
          product.categoryId,
          product.priceCents,
          product.costPriceCents,
          product.taxRateBp,
          product.description,
          product.imageUrl,
          product.lowStockLevel,
          product.stockKind,
          product.pourSizeMl,
          product.stockItemId,
          product.active,
        ],
      );
    }

    await client.query("COMMIT");
    console.log(
      `Seeded ${KUTANA_MENU_CATEGORIES.length} categories and ${KUTANA_MENU_PRODUCTS.length} products from KUTANA PDF menu.`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

void (async () => {
  try {
    await seed();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
