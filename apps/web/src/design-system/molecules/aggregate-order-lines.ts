export interface AggregatableOrderLine {
  readonly id: string;
  readonly productId: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly totalCents: number;
  readonly taxCents?: number;
  readonly taxRateBp: number;
  readonly pourSizeMl: number | null;
  readonly isAdjustment: boolean;
}

/**
 * Groups only lines whose persisted sale attributes are equivalent. The order
 * keeps immutable lines for audit/payment allocation; this is presentation-only.
 * If the domain later adds modifiers, discounts, notes or a variant id, append
 * those fields to this key before enabling grouping for them.
 */
export function orderLineGroupingKey(line: AggregatableOrderLine): string {
  return [
    line.productId,
    line.name,
    line.unitPriceCents,
    line.pourSizeMl ?? "",
    line.taxRateBp,
    line.isAdjustment ? "adjustment" : "sale",
  ].join("\u001f");
}

export function aggregateOrderLines<T extends AggregatableOrderLine>(lines: readonly T[]): T[] {
  const groups = new Map<string, T>();
  for (const line of lines) {
    const key = orderLineGroupingKey(line);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { ...line });
      continue;
    }
    groups.set(key, {
      ...existing,
      quantity: existing.quantity + line.quantity,
      totalCents: existing.totalCents + line.totalCents,
      taxCents:
        existing.taxCents !== undefined && line.taxCents !== undefined
          ? existing.taxCents + line.taxCents
          : existing.taxCents,
    });
  }
  return [...groups.values()];
}
