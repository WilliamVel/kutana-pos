export interface AnalyticsDateRange {
  readonly from?: string;
  readonly to?: string;
}

export const ANALYTICS_TIMEZONE = "America/Guayaquil" as const;
export const ANALYTICS_CURRENCY = "USD" as const;

export type AnalyticsProductSort = "revenue" | "quantity";

export interface AnalyticsPageQuery extends AnalyticsDateRange {
  readonly search?: string;
  readonly sort?: AnalyticsProductSort;
  readonly page?: number;
  readonly pageSize?: number;
}

export interface DailySalesTotal {
  readonly date: string;
  readonly currencyCode: string;
  readonly totalCents: number;
}

export interface ProductMixRow {
  readonly productId: string;
  readonly name: string;
  readonly presentationSize: string | null;
  readonly quantity: number;
  readonly revenueCents: number;
  readonly currencyCode: string;
}

export interface PaymentMixRow {
  readonly methodCode: string;
  readonly methodLabel: string;
  readonly amountCents: number;
  readonly currencyCode: string;
}

export interface PendingExposureRow {
  readonly customerId: string | null;
  readonly accountId: string | null;
  readonly pendingCents: number;
  readonly currencyCode: string;
}

export interface ProductMixPage {
  readonly rows: readonly ProductMixRow[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface DailySalesPage {
  readonly rows: readonly DailySalesTotal[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly granularity: "day" | "week" | "month";
}

export interface AnalyticsSummary {
  readonly timezone: typeof ANALYTICS_TIMEZONE;
  readonly currencyCode: typeof ANALYTICS_CURRENCY;
  readonly from: string | null;
  readonly to: string | null;
  readonly grossSalesCents: number;
  readonly collectedCents: number;
  readonly orderCount: number;
  readonly averageOrderCents: number | null;
  readonly trendGranularity: "day" | "week" | "month";
  readonly dailySales: readonly DailySalesTotal[];
  readonly productMix: readonly ProductMixRow[];
  readonly paymentMix: readonly PaymentMixRow[];
  readonly pendingExposure: readonly PendingExposureRow[];
}

/** @deprecated Use AnalyticsSummary for the reconciled analytics contract. */
export interface AnalyticsSnapshot {
  readonly dailySales: readonly DailySalesTotal[];
  readonly productMix: readonly ProductMixRow[];
  readonly paymentMix: readonly PaymentMixRow[];
  readonly pendingExposure: readonly PendingExposureRow[];
}
