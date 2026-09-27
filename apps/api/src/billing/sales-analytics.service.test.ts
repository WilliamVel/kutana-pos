import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { SalesAnalyticsService } from "./sales-analytics.service.js";

describe("SalesAnalyticsService", () => {
  function makeService() {
    const query = vi.fn();
    return { service: new SalesAnalyticsService({ query } as unknown as Pool), query };
  }

  it("returns daily totals with explicit currencies and inclusive date parameters", async () => {
    const { service, query } = makeService();
    query.mockResolvedValue({ rows: [{ date: "2025-01-02", currency_code: "USD", total_cents: "1200" }] });

    await expect(service.dailySales({ from: "2025-01-01", to: "2025-01-02" })).resolves.toEqual([
      { date: "2025-01-02", currencyCode: "USD", totalCents: 1200 },
    ]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("FROM sales s"), ["2025-01-01", "2025-01-02"]);
    expect(query.mock.calls[0]![0]).toContain("$2::date + INTERVAL '1 day'");
    expect(query.mock.calls[0]![0]).not.toMatch(/orders\s+\.\s*status|o\.status/);
  });

  it("queries normalized product and payment history", async () => {
    const { service, query } = makeService();
    query
      .mockResolvedValueOnce({ rows: [{ product_id: "p1", name: "Coffee", currency_code: "USD", quantity: "2", revenue_cents: "1000" }] })
      .mockResolvedValueOnce({ rows: [{ method_code: "cash", method_label: "Efectivo", currency_code: "USD", amount_cents: "1000" }] });

    await expect(service.productMix()).resolves.toEqual([
      { productId: "p1", name: "Coffee", presentationSize: null, currencyCode: "USD", quantity: 2, revenueCents: 1000 }
    ]);
    await expect(service.paymentMix()).resolves.toEqual([
      { methodCode: "cash", methodLabel: "Efectivo", currencyCode: "USD", amountCents: 1000 },
    ]);
    expect(query.mock.calls[0]![0]).toContain("FROM sale_items si JOIN sales s");
    expect(query.mock.calls[1]![0]).toContain("FROM sale_settlements ss JOIN sales s");
  });

  it("rejects malformed, impossible, and reversed date ranges before querying", async () => {
    const { service, query } = makeService();
    await expect(service.dailySales({ from: "2025-02-30" })).rejects.toThrow(BadRequestException);
    await expect(service.dailySales({ from: "2025-02-02", to: "2025-02-01" })).rejects.toThrow(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });

  it("uses the business timezone for midnight boundaries and bounds long ranges", async () => {
    const { service, query } = makeService();
    query.mockResolvedValue({ rows: [] });
    await service.dailySales({ from: "2025-01-01", to: "2025-01-02" });
    expect(query.mock.calls[0]![0]).toContain("AT TIME ZONE 'America/Guayaquil'");
    await expect(service.dailySales({ from: "2025-01-01", to: "2026-01-02" })).rejects.toThrow(/366 days/);
  });

  it("aggregates pending exposure from sale snapshots without orders status", async () => {
    const { service, query } = makeService();
    query.mockResolvedValue({ rows: [{ customer_id: "c1", account_id: "a1", currency_code: "USD", pending_cents: "550" }] });

    await expect(service.pendingExposure()).resolves.toEqual([
      { customerId: "c1", accountId: "a1", currencyCode: "USD", pendingCents: 550 },
    ]);
    expect(query.mock.calls[0]![0]).toContain("s.pending_cents > 0");
    expect(query.mock.calls[0]![0]).not.toContain("orders");
  });
});
