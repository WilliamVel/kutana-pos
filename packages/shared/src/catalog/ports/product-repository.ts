import type { Product } from "../model/product.js";

/** Port contract only — implementations live in adapters (mock/HTTP/Postgres). */
export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  findBySku(sku: string): Promise<Product | null>;
  findByBarcode(barcode: string): Promise<Product | null>;
  /** Only active products by default; callers needing inactive ones pass includeInactive. */
  listByCategory(categoryId: string, options?: { includeInactive?: boolean }): Promise<Product[]>;
  /** Throws ConflictError<Product> if the stored version !== expectedVersion. */
  save(product: Product, expectedVersion: number): Promise<Product>;
}
