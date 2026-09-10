import { describe, expect, it } from "vitest";
import { createSale, type SaleSettlementSnapshot } from "../model/sale.js";
import { calculateTaxCents, reconcileSaleSnapshot, roundHalfUpToCents } from "./sale-snapshot.js";

const item = { id: "item-1", saleId: "sale-1", productId: "p-1", name: "Meal", quantity: 1, unitPriceCents: 1000, subtotalCents: 1000, taxCents: 88, discountCents: 0, totalCents: 1088 };
const settlement = (overrides: Partial<SaleSettlementSnapshot> = {}): SaleSettlementSnapshot => ({ id: "settlement-1", saleId: "sale-1", methodCode: "CASH", amountCents: 1088, tenderedCents: 1100, changeCents: 12, settledAt: "2025-01-02T00:00:00.000Z", ...overrides });

type SaleOverrides = Partial<Omit<Parameters<typeof createSale>[0], "orderId" | "totalCents" | "taxTotalCents">> & Partial<Pick<Parameters<typeof createSale>[0], "totalCents" | "taxTotalCents">>;

function sale(overrides: SaleOverrides = {}) {
  return createSale({ id: "sale-1", orderId: "order-1", subtotalCents: 1000, taxTotalCents: 88, totalCents: 1088, paidCents: 1088, items: [item], settlements: [settlement()], ...overrides });
}

describe("sale snapshot reconciliation", () => {
  it("reconciles items and settlements, including cash change", () => expect(reconcileSaleSnapshot(sale())).toEqual({ subtotalCents: 1000, taxTotalCents: 88, discountTotalCents: 0, totalCents: 1088, paidCents: 1088, pendingCents: 0 }));
  it("rejects an invalid mismatch", () => expect(() => reconcileSaleSnapshot(sale({ totalCents: 1087 }))).toThrow(/does not reconcile/));
  it("rejects incorrect cash change", () => expect(() => reconcileSaleSnapshot(sale({ settlements: [settlement({ changeCents: 13 })] }))).toThrow(/change/));
  it("uses exact decimal half-up rounding", () => {
    expect(roundHalfUpToCents("10.125")).toBe(1013);
    expect(roundHalfUpToCents("10.124")).toBe(1012);
    expect(calculateTaxCents({ taxableCents: 101, taxRate: "8.25" })).toBe(8);
  });
});
