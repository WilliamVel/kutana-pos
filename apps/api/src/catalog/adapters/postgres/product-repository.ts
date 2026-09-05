import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { ConflictError } from "@kutana/shared/errors/conflict-error.js";
import type { Product } from "@kutana/shared/catalog/model/product.js";
import type { ProductRepository } from "@kutana/shared/catalog/ports/product-repository.js";
import { PostgresPool } from "../../../infrastructure/postgres/postgres-pool.js";

interface ProductRow {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category_id: string;
  price_cents: number;
  cost_price_cents: number | null;
  tax_rate_bp: number;
  description: string | null;
  image_url: string | null;
  low_stock_level: string | number | null;
  stock_kind: Product["stockKind"];
  pour_size_ml: number | null;
  stock_item_id: string | null;
  active: boolean;
  version: number;
}

const toNumber = (value: string | number | null): number | null =>
  value === null ? null : Number(value);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const mapProduct = (row: ProductRow): Product => ({
  id: row.id,
  sku: row.sku,
  barcode: row.barcode,
  name: row.name,
  categoryId: row.category_id,
  priceCents: row.price_cents,
  costPriceCents: row.cost_price_cents,
  taxRateBp: row.tax_rate_bp,
  description: row.description,
  imageUrl: row.image_url,
  lowStockLevel: toNumber(row.low_stock_level),
  stockKind: row.stock_kind,
  pourSizeMl: row.pour_size_ml as Product["pourSizeMl"],
  stockItemId: row.stock_item_id,
  active: row.active,
  version: row.version,
});

@Injectable()
export class PostgresProductRepository implements ProductRepository {
  constructor(@Inject(PostgresPool) private readonly pool: Pool) {}

  async findById(id: string): Promise<Product | null> {
    if (!UUID_PATTERN.test(id)) return null;
    const result = await this.pool.query<ProductRow>("SELECT * FROM products WHERE id = $1", [id]);
    return result.rows[0] ? mapProduct(result.rows[0]) : null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const result = await this.pool.query<ProductRow>("SELECT * FROM products WHERE sku = $1", [sku]);
    return result.rows[0] ? mapProduct(result.rows[0]) : null;
  }

  async findByBarcode(barcode: string): Promise<Product | null> {
    const result = await this.pool.query<ProductRow>("SELECT * FROM products WHERE barcode = $1", [barcode]);
    return result.rows[0] ? mapProduct(result.rows[0]) : null;
  }

  async listByCategory(categoryId: string, options?: { includeInactive?: boolean }): Promise<Product[]> {
    const result = await this.pool.query<ProductRow>(
      `SELECT * FROM products WHERE category_id = $1${options?.includeInactive === true ? "" : " AND active = true"} ORDER BY id`,
      [categoryId],
    );
    return result.rows.map(mapProduct);
  }

  async save(product: Product, expectedVersion: number): Promise<Product> {
    const result = await this.pool.query<ProductRow>(
      `INSERT INTO products
        (id, sku, barcode, name, category_id, price_cents, cost_price_cents, tax_rate_bp, description, image_url,
         low_stock_level, stock_kind, pour_size_ml, stock_item_id, active, version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (id) DO UPDATE SET
         sku = EXCLUDED.sku, barcode = EXCLUDED.barcode, name = EXCLUDED.name, category_id = EXCLUDED.category_id,
         price_cents = EXCLUDED.price_cents, cost_price_cents = EXCLUDED.cost_price_cents, tax_rate_bp = EXCLUDED.tax_rate_bp,
         description = EXCLUDED.description, image_url = EXCLUDED.image_url, low_stock_level = EXCLUDED.low_stock_level,
         stock_kind = EXCLUDED.stock_kind, pour_size_ml = EXCLUDED.pour_size_ml, stock_item_id = EXCLUDED.stock_item_id,
         active = EXCLUDED.active, version = products.version + 1
       WHERE products.version = EXCLUDED.version - 1
       RETURNING *`,
      [
        product.id, product.sku, product.barcode, product.name, product.categoryId, product.priceCents,
        product.costPriceCents, product.taxRateBp, product.description, product.imageUrl, product.lowStockLevel,
        product.stockKind, product.pourSizeMl, product.stockItemId, product.active, expectedVersion + 1,
      ],
    );
    if (result.rows[0]) return mapProduct(result.rows[0]);
    const current = await this.findById(product.id);
    if (!current) throw new Error(`Product ${product.id} could not be saved`);
    throw new ConflictError<Product>(
      `Product ${product.id} version conflict: expected ${expectedVersion}, stored ${current.version}`,
      current,
    );
  }
}
