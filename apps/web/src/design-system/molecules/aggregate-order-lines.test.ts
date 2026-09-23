import { describe, expect, it } from "vitest";
import { aggregateOrderLines } from "./aggregate-order-lines.js";

const line = (overrides: Partial<Parameters<typeof aggregateOrderLines>[0][number]> = {}) => ({
  id: "line-1",
  productId: "product-1",
  name: "Blonde Ale 1000ml",
  quantity: 1,
  unitPriceCents: 896,
  totalCents: 997,
  taxCents: 101,
  taxRateBp: 1200,
  pourSizeMl: 1000,
  isAdjustment: false,
  ...overrides,
});

describe("aggregateOrderLines", () => {
  it("groups equivalent immutable lines and preserves unit totals", () => {
    const result = aggregateOrderLines([
      line(),
      line({ id: "line-2", quantity: 2, totalCents: 1994, taxCents: 202 }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ quantity: 3, totalCents: 2991, taxCents: 303 });
  });

  it("does not group a different price, tax, presentation, or adjustment", () => {
    const result = aggregateOrderLines([
      line(),
      line({ id: "line-2", unitPriceCents: 900 }),
      line({ id: "line-3", pourSizeMl: 500 }),
      line({ id: "line-4", taxRateBp: 0 }),
      line({ id: "line-5", isAdjustment: true }),
    ]);
    expect(result).toHaveLength(5);
  });
});
