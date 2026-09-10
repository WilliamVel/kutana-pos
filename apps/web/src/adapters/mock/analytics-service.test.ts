import { describe, expect, it } from "vitest";
import { MockAnalyticsService } from "./analytics-service.js";

describe("MockAnalyticsService", () => {
  it("returns the analytics fixture snapshot", async () => {
    const service = new MockAnalyticsService();

    await expect(service.dailySales()).resolves.toHaveLength(3);
    await expect(service.productMix()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productId: "beer-1", name: "Blonde Ale 330ml" }),
      ]),
    );
    await expect(service.paymentMix()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ methodCode: "card", amountCents: 43100 })]),
    );
    await expect(service.pendingExposure()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ customerId: null, pendingCents: 3200 })]),
    );
  });

  it("filters daily sales inclusively by the requested date range", async () => {
    const service = new MockAnalyticsService();

    await expect(service.dailySales({ from: "2025-01-21", to: "2025-01-21" })).resolves.toEqual([
      { date: "2025-01-21", currencyCode: "USD", totalCents: 23100 },
    ]);
  });
});
