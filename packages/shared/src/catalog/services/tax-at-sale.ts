import { computeTaxCents } from "../model/tax-rate.js";
import type { Product } from "../model/product.js";

/**
 * The SRI seam: tax is computed and frozen at the moment of sale, reading
 * the product's rate at the time this function is called. A LineItem is
 * created from this snapshot and never re-reads the catalog again — a
 * later change to `Product.taxRateBp` MUST NOT retroactively alter a
 * historical LineItem's persisted tax. This is a pure function with no
 * hidden state: it is exactly as frozen as the caller freezes its result.
 */
export interface TaxSnapshot {
  readonly subtotalCents: number;
  readonly taxRateBp: number;
  readonly taxCents: number;
  readonly totalCents: number;
}

export function snapshotTaxForSale(product: Product, input: { quantity: number }): TaxSnapshot {
  const subtotalCents = product.priceCents * input.quantity;
  const taxCents = computeTaxCents(subtotalCents, product.taxRateBp);
  return {
    subtotalCents,
    taxRateBp: product.taxRateBp,
    taxCents,
    totalCents: subtotalCents + taxCents,
  };
}
