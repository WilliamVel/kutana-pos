import { describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { PaymentClosureService } from "./payment-closure.service.js";

describe("PaymentClosureService", () => {
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
