import { ValidationError } from "../../errors/domain-error.js";

export type StockKind = "unit" | "volume";

/** Valid draft-beer pour sizes, in millilitres. Each size is priced independently. */
export type PourSize = 500 | 750 | 1000;

export interface Product {
  readonly id: string;
  readonly sku: string;
  readonly barcode: string | null;
  readonly name: string;
  readonly categoryId: string;
  readonly priceCents: number;
  /** Integer cents; null when the cost is unknown. Drives margin calculations (Milestone 3 reporting). */
  readonly costPriceCents: number | null;
  /** Tax rate in basis points, frozen per-LineItem at sale time — see catalog/services/tax-at-sale.ts */
  readonly taxRateBp: number;
  readonly description: string | null;
  readonly imageUrl: string | null;
  readonly lowStockLevel: number | null;
  readonly stockKind: StockKind;
  /** Required and only meaningful when stockKind === 'volume'. */
  readonly pourSizeMl: PourSize | null;
  /** The shared StockItem this product draws down (a volume-kind keg is shared across pour sizes). */
  readonly stockItemId: string | null;
  readonly active: boolean;
  readonly version: number;
}

export function createProduct(input: {
  sku: string;
  name: string;
  categoryId: string;
  priceCents: number;
  taxRateBp: number;
  stockKind: StockKind;
  barcode?: string | null;
  description?: string | null;
  costPriceCents?: number | null;
  imageUrl?: string | null;
  lowStockLevel?: number | null;
  pourSizeMl?: PourSize | null;
  stockItemId?: string | null;
  id?: string;
}): Product {
  if (!Number.isInteger(input.priceCents) || input.priceCents < 0) {
    throw new ValidationError(
      `Product.priceCents must be a non-negative integer, received: ${input.priceCents}`,
    );
  }
  if (
    input.costPriceCents !== undefined &&
    input.costPriceCents !== null &&
    (!Number.isInteger(input.costPriceCents) || input.costPriceCents < 0)
  ) {
    throw new ValidationError(
      `Product.costPriceCents must be a non-negative integer or null, received: ${input.costPriceCents}`,
    );
  }
  if (
    input.stockKind === "volume" &&
    (input.pourSizeMl === undefined || input.pourSizeMl === null)
  ) {
    throw new ValidationError("Product with stockKind 'volume' requires a pourSizeMl");
  }

  return {
    id: input.id ?? crypto.randomUUID(),
    sku: input.sku,
    barcode: input.barcode ?? null,
    name: input.name,
    categoryId: input.categoryId,
    priceCents: input.priceCents,
    costPriceCents: input.costPriceCents ?? null,
    taxRateBp: input.taxRateBp,
    description: input.description ?? null,
    imageUrl: input.imageUrl ?? null,
    lowStockLevel: input.lowStockLevel ?? null,
    stockKind: input.stockKind,
    pourSizeMl: input.pourSizeMl ?? null,
    stockItemId: input.stockItemId ?? null,
    active: true,
    version: 1,
  };
}

export function withActive(product: Product, active: boolean): Product {
  return { ...product, active, version: product.version + 1 };
}

/** Deactivated products MUST NOT appear as orderable to waiters (spec scenario). */
export function isOrderable(product: Product): boolean {
  return product.active;
}
