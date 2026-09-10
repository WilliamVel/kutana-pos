import { describe, expect, it, vi } from "vitest";
import { HttpPaymentClosureService } from "./payment-closure-service.js";

describe("HttpPaymentClosureService", () => {
  it("posts an authenticated order closure request and returns the sale", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer token-1");
      return new Response(JSON.stringify({ orderId: "order/1" }), { status: 200 });
    }) as unknown as typeof fetch;
    const service = new HttpPaymentClosureService({
      baseUrl: "https://api.example.test",
      fetchImpl,
      getBearerToken: () => "token-1",
    });

    await expect(service.closeOrder("order/1")).resolves.toEqual({ orderId: "order/1" });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/billing/orders/order%2F1/close",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
