import type {
  AnalyticsDateRange,
  DailySalesTotal,
  PaymentMixRow,
  PendingExposureRow,
  ProductMixRow,
} from "@kutana/shared/analytics/model/analytics.js";
import type { AnalyticsReadPort } from "@kutana/shared/analytics/ports/analytics-service.js";

const FIXTURES = {
  dailySales: [
    { date: "2025-01-20", currencyCode: "USD", totalCents: 18450 },
    { date: "2025-01-21", currencyCode: "USD", totalCents: 23100 },
    { date: "2025-01-22", currencyCode: "USD", totalCents: 19750 },
  ],
  productMix: [
    {
      productId: "beer-1",
      name: "Blonde Ale 330ml",
      quantity: 42,
      revenueCents: 12600,
      currencyCode: "USD",
    },
    {
      productId: "beer-2",
      name: "Pilsener",
      quantity: 31,
      revenueCents: 10850,
      currencyCode: "USD",
    },
    {
      productId: "food-1",
      name: "Hamburguesa KUTANA",
      quantity: 18,
      revenueCents: 21600,
      currencyCode: "USD",
    },
  ],
  paymentMix: [
    { methodCode: "cash", amountCents: 18200, currencyCode: "USD" },
    { methodCode: "card", amountCents: 43100, currencyCode: "USD" },
  ],
  pendingExposure: [
    {
      customerId: "customer-ada",
      accountId: "account-ada",
      pendingCents: 7500,
      currencyCode: "USD",
    },
    { customerId: null, accountId: "account-free-name", pendingCents: 3200, currencyCode: "USD" },
  ],
} as const;

export class MockAnalyticsService implements AnalyticsReadPort {
  dailySales(range?: AnalyticsDateRange): Promise<DailySalesTotal[]> {
    return Promise.resolve(filter(FIXTURES.dailySales, range, (row) => row.date));
  }
  productMix(range?: AnalyticsDateRange): Promise<ProductMixRow[]> {
    return Promise.resolve([...FIXTURES.productMix]);
  }
  paymentMix(range?: AnalyticsDateRange): Promise<PaymentMixRow[]> {
    return Promise.resolve([...FIXTURES.paymentMix]);
  }
  pendingExposure(range?: AnalyticsDateRange): Promise<PendingExposureRow[]> {
    return Promise.resolve([...FIXTURES.pendingExposure]);
  }
}

function filter<T>(
  rows: readonly T[],
  range: AnalyticsDateRange | undefined,
  date: (row: T) => string,
): T[] {
  return rows.filter(
    (row) => (!range?.from || date(row) >= range.from) && (!range?.to || date(row) <= range.to),
  );
}
