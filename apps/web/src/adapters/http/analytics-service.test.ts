import { describe, expect, it, vi } from "vitest";
import { HttpAnalyticsService } from "./analytics-service.js";

const BASE_URL = "http://api.example.test";

interface FetchCall {
  readonly url: string;
  readonly init: RequestInit;
}

function createFetch(): { readonly fetchImpl: typeof fetch; readonly calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
  }) as unknown as typeof fetch;

  return { fetchImpl, calls };
}

describe("HttpAnalyticsService", () => {
  it("requests each analytics report and forwards date filters", async () => {
    const { fetchImpl, calls } = createFetch();
    const service = new HttpAnalyticsService({ baseUrl: BASE_URL, fetchImpl });
    const range = { from: "2025-01-20", to: "2025-01-22" };

    await service.dailySales(range);
    await service.productMix(range);
    await service.paymentMix(range);
    await service.pendingExposure(range);

    expect(calls.map((call) => call.url)).toEqual([
      `${BASE_URL}/billing/analytics/daily-sales?from=2025-01-20&to=2025-01-22`,
      `${BASE_URL}/billing/analytics/product-mix?from=2025-01-20&to=2025-01-22`,
      `${BASE_URL}/billing/analytics/payment-mix?from=2025-01-20&to=2025-01-22`,
      `${BASE_URL}/billing/analytics/pending-exposure?from=2025-01-20&to=2025-01-22`,
    ]);
  });
});
