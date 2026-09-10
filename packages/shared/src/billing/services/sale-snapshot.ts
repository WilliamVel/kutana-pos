import { ValidationError } from "../../errors/domain-error.js";
import type { Sale, SaleItemSnapshot, SaleSettlementSnapshot } from "../model/sale.js";

export type DecimalInput = string | number;

function decimalParts(value: DecimalInput): { coefficient: bigint; scale: number } {
  const text = typeof value === "number" ? String(value) : value.trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) throw new ValidationError(`Invalid decimal value: ${value}`);
  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;
  const [whole, fraction = ""] = unsigned.split(".");
  return { coefficient: BigInt(`${whole}${fraction}`) * (negative ? -1n : 1n), scale: fraction.length };
}

/** Exact decimal, half-up rounding to the smallest currency unit. */
export function roundHalfUpToCents(value: DecimalInput): number {
  const { coefficient, scale } = decimalParts(value);
  if (scale <= 2) return Number(coefficient * 10n ** BigInt(2 - scale));
  const divisor = 10n ** BigInt(scale - 2);
  const sign = coefficient < 0n ? -1n : 1n;
  const absolute = coefficient < 0n ? -coefficient : coefficient;
  return Number(sign * ((absolute + divisor / 2n) / divisor));
}

export function calculateTaxCents(input: { taxableCents: number; taxRate: DecimalInput }): number {
  if (input.taxableCents < 0) throw new ValidationError("Taxable amount cannot be negative");
  const { coefficient, scale } = decimalParts(input.taxRate);
  if (coefficient < 0n) throw new ValidationError("Tax rate cannot be negative");
  const divisor = 100n * 10n ** BigInt(scale);
  return Number((BigInt(input.taxableCents) * coefficient + divisor / 2n) / divisor);
}

export interface SaleReconciliation {
  readonly subtotalCents: number;
  readonly taxTotalCents: number;
  readonly discountTotalCents: number;
  readonly totalCents: number;
  readonly paidCents: number;
  readonly pendingCents: number;
}

/** Purely reconciles an immutable closure snapshot; refunds are intentionally unsupported. */
export function reconcileSaleSnapshot(sale: Sale): SaleReconciliation {
  const items = sale.items;
  const subtotalCents = items.reduce((sum, item) => sum + item.subtotalCents, 0);
  const taxTotalCents = items.reduce((sum, item) => sum + item.taxCents, 0);
  const discountTotalCents = items.reduce((sum, item) => sum + (item.discountCents ?? 0), 0);
  const itemTotalCents = items.reduce((sum, item) => sum + item.totalCents, 0);
  const paidCents = sale.settlements.reduce((sum, settlement) => {
    if (settlement.amountCents < 0 || settlement.changeCents !== null && settlement.changeCents < 0) {
      throw new ValidationError("Refunds are not supported in sale closure snapshots");
    }
    if (settlement.tenderedCents !== null && settlement.tenderedCents < settlement.amountCents) {
      throw new ValidationError(`Tendered amount is less than settlement amount: ${settlement.id}`);
    }
    if (settlement.tenderedCents !== null && settlement.changeCents !== settlement.tenderedCents - settlement.amountCents) {
      throw new ValidationError(`Settlement change does not reconcile: ${settlement.id}`);
    }
    return sum + settlement.amountCents;
  }, 0);
  const totalCents = subtotalCents + taxTotalCents - discountTotalCents;
  const pendingCents = totalCents - paidCents;
  const expected: SaleReconciliation = {
    subtotalCents,
    taxTotalCents,
    discountTotalCents,
    totalCents,
    paidCents,
    pendingCents,
  };
  if (itemTotalCents !== totalCents || sale.subtotalCents !== subtotalCents || sale.taxTotalCents !== taxTotalCents ||
      sale.discountTotalCents !== discountTotalCents || sale.totalCents !== totalCents || sale.paidCents !== paidCents ||
      sale.pendingCents !== pendingCents || sale.status !== (pendingCents > 0 ? "pending" : "paid")) {
    throw new ValidationError("Sale closure snapshot does not reconcile");
  }
  return expected;
}

export function validateSaleReconciliation(sale: Sale): true {
  reconcileSaleSnapshot(sale);
  return true;
}

export type { SaleItemSnapshot, SaleSettlementSnapshot };
