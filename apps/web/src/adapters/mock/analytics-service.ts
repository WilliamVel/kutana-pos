import { ANALYTICS_TIMEZONE } from "@kutana/shared/analytics/model/analytics.js";
import type {
  AnalyticsDateRange,
  AnalyticsSummary,
  DailySalesTotal,
  PaymentMixRow,
  PendingExposureRow,
  ProductMixPage,
  ProductMixRow,
  DailySalesPage,
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
      presentationSize: null,
      currencyCode: "USD",
    },
    {
      productId: "beer-2",
      name: "Pilsener",
      quantity: 31,
      revenueCents: 10850,
      presentationSize: null,
      currencyCode: "USD",
    },
    {
      productId: "food-1",
      name: "Hamburguesa KUTANA",
      quantity: 18,
      revenueCents: 21600,
      presentationSize: null,
      currencyCode: "USD",
    },
    ...Array.from({ length: 9 }, (_, index) => ({
      productId: `product-${index + 4}`,
      name: index === 8 ? "Producto fuera del Top 10" : `Producto adicional ${index + 1}`,
      quantity: 2,
      revenueCents: 1000 - index * 50,
      presentationSize: null,
      currencyCode: "USD" as const,
    })),
  ],
  paymentMix: [
    { methodCode: "cash", methodLabel: "Cash", amountCents: 18200, currencyCode: "USD" },
    { methodCode: "card", methodLabel: "Card", amountCents: 43100, currencyCode: "USD" },
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
  summary(range?: AnalyticsDateRange): Promise<AnalyticsSummary> {
    return Promise.all([this.dailySales(range), this.productMix(range), this.paymentMix(range), this.pendingExposure(range)]).then(([dailySales, productMix, paymentMix, pendingExposure]) => ({
      timezone: ANALYTICS_TIMEZONE, currencyCode: "USD", from: range?.from ?? null, to: range?.to ?? null, trendGranularity: "day",
      grossSalesCents: dailySales.reduce((sum, row) => sum + row.totalCents, 0), collectedCents: paymentMix.reduce((sum, row) => sum + row.amountCents, 0),
      orderCount: dailySales.length, averageOrderCents: dailySales.length ? Math.round(dailySales.reduce((sum, row) => sum + row.totalCents, 0) / dailySales.length) : null, dailySales, productMix, paymentMix, pendingExposure,
    }));
  }
  dailySales(range?: AnalyticsDateRange): Promise<DailySalesTotal[]> {
    return Promise.resolve(filter(FIXTURES.dailySales, range, (row) => row.date));
  }
  productMix(range?: AnalyticsDateRange): Promise<ProductMixRow[]> {
    void range;
    return Promise.resolve(FIXTURES.productMix.slice(0, 5));
  }
  productDetail(query: AnalyticsDateRange & { search?: string; sort?: "revenue" | "quantity"; page?: number; pageSize?: number } = {}): Promise<ProductMixPage> {
    const search = query.search?.toLowerCase().trim();
    const rows = [...FIXTURES.productMix].filter((row) => !search || row.name.toLowerCase().includes(search));
    rows.sort((a, b) => query.sort === "quantity" ? b.quantity - a.quantity || a.name.localeCompare(b.name) || a.productId.localeCompare(b.productId) : b.revenueCents - a.revenueCents || a.name.localeCompare(b.name) || a.productId.localeCompare(b.productId));
    const page = query.page ?? 0; const pageSize = query.pageSize ?? 10;
    return Promise.resolve({ rows: rows.slice(page * pageSize, (page + 1) * pageSize), total: rows.length, page, pageSize });
  }
  dailyDetail(query: AnalyticsDateRange & { page?: number; pageSize?: number } = {}): Promise<DailySalesPage> {
    const rows = filter(FIXTURES.dailySales, query, (row) => row.date); const page = query.page ?? 0; const pageSize = query.pageSize ?? 10;
    return Promise.resolve({ rows: rows.slice(page * pageSize, (page + 1) * pageSize), total: rows.length, page, pageSize, granularity: "day" });
  }
  paymentMix(range?: AnalyticsDateRange): Promise<PaymentMixRow[]> {
    void range;
    return Promise.resolve([...FIXTURES.paymentMix]);
  }
  pendingExposure(range?: AnalyticsDateRange): Promise<PendingExposureRow[]> {
    void range;
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
