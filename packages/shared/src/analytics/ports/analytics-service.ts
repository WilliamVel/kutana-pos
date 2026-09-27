import type {
  AnalyticsDateRange,
  AnalyticsPageQuery,
  AnalyticsSummary,
  DailySalesPage,
  DailySalesTotal,
  PaymentMixRow,
  PendingExposureRow,
  ProductMixPage,
  ProductMixRow,
} from "../model/analytics.js";

export interface AnalyticsReadPort {
  summary(range?: AnalyticsDateRange): Promise<AnalyticsSummary>;
  dailySales(range?: AnalyticsDateRange): Promise<DailySalesTotal[]>;
  dailyDetail(query?: AnalyticsPageQuery): Promise<DailySalesPage>;
  productMix(range?: AnalyticsDateRange): Promise<ProductMixRow[]>;
  productDetail(query?: AnalyticsPageQuery): Promise<ProductMixPage>;
  paymentMix(range?: AnalyticsDateRange): Promise<PaymentMixRow[]>;
  pendingExposure(range?: AnalyticsDateRange): Promise<PendingExposureRow[]>;
}
