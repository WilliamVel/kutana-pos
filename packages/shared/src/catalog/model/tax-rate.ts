/**
 * Tax rate is stored as basis points (bp), integer, no floats. A product's
 * `taxRateBp` is the CURRENT catalog rate; it is only ever frozen into a
 * concrete tax amount at the moment a LineItem is created — see
 * `catalog/services/tax-at-sale.ts`. This module holds the pure conversion
 * helper only.
 */
export function computeTaxCents(subtotalCents: number, taxRateBp: number): number {
  return Math.round((subtotalCents * taxRateBp) / 10_000);
}
