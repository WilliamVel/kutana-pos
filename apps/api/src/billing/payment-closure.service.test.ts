import { describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { PaymentClosureService } from "./payment-closure.service.js";

describe("PaymentClosureService", () => {
  it("persists paid and pending cents from a partial account payment", async () => {
    const persisted: Array<{ query: string; params: unknown[] }> = [];
    const client = {
      query: vi.fn(async (query: string, params: unknown[] = []) => {
        persisted.push({ query, params });
        if (query === "BEGIN" || query === "COMMIT" || query === "ROLLBACK") return { rows: [] };
        if (query.includes("FROM orders WHERE")) return { rows: [{ id: "order-1", table_id: "table-1", status: "active", opened_at: "2025-01-01T10:00:00.000Z", closed_at: null, customer_id: null, version: 1 }] };
        if (query.includes("SELECT id FROM sales")) return { rows: [] };
        if (query.includes("FROM line_items")) return { rows: [{ id: "line-1", order_id: "order-1", product_id: "product-1", name_snapshot: "Meal", unit_price_cents: 1000, quantity: 1, tax_cents: 0, total_cents: 1000, created_at: "2025-01-01T10:01:00.000Z" }] };
        if (query.includes("FROM account_line_allocations")) return { rows: [{ id: "allocation-1", account_id: "account-1", line_item_id: "line-1", quantity: 1 }] };
        if (query.includes("FROM personal_accounts")) return { rows: [{ id: "account-1", order_id: "order-1", customer_id: null, free_name: "Guest", status: "pending", created_at: "2025-01-01T10:00:00.000Z", closed_at: null, version: 1 }] };
        if (query.includes("FROM payments")) return { rows: [{ id: "payment-1", account_id: "account-1", customer_id: null, ticket_id: null, method_code: "CASH", amount_cents: 400, tendered_cents: 400, change_cents: 0, recorded_at: "2025-01-01T10:02:00.000Z" }] };
        if (query.includes("FROM tickets")) return { rows: [] };
        return { rows: [] };
      }),
      release: vi.fn(),
    };
    const pool = { connect: vi.fn().mockResolvedValue(client) };
    const sale = await new PaymentClosureService(pool as never).closeOrder("order-1", "operator-1");

    expect(sale.paidCents).toBe(400);
    expect(sale.pendingCents).toBe(600);
    expect(sale.paidCents + sale.pendingCents).toBe(sale.totalCents);
    expect(sale.settlements.reduce((sum, settlement) => sum + settlement.amountCents, 0)).toBe(sale.paidCents);

    const salesInsert = persisted.find(({ query }) => query.includes("INSERT INTO sales"));
    expect(salesInsert?.params.slice(7, 10)).toEqual([1000, 400, 600]);
    const settlementInserts = persisted.filter(({ query }) => query.includes("INSERT INTO sale_settlements"));
    expect(settlementInserts).toHaveLength(1);
    expect(settlementInserts[0]?.params[3]).toBe(400);
  });

  it("requires the authenticated operator before opening a transaction", async () => {
    const pool = { connect: vi.fn() };
    const service = new PaymentClosureService(pool as never);

    await expect(service.closeOrder("order-1", "")).rejects.toThrow(/operator/i);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it("rolls back when the locked order does not exist", async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] }),
      release: vi.fn(),
    };
    const pool = { connect: vi.fn().mockResolvedValue(client) };
    const service = new PaymentClosureService(pool as never);

    await expect(service.closeOrder("missing-order", "operator-1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenLastCalledWith("ROLLBACK");
    expect(client.release).toHaveBeenCalledOnce();
  });
});
