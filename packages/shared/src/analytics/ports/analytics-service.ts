import type {
  AnalyticsDateRange,
  DailySalesTotal,
  PaymentMixRow,
  PendingExposureRow,
  ProductMixRow,
} from "../model/analytics.js";

export interface AnalyticsReadPort {
  dailySales(range?: AnalyticsDateRange): Promise<DailySalesTotal[]>;
  productMix(range?: AnalyticsDateRange): Promise<ProductMixRow[]>;
  paymentMix(range?: AnalyticsDateRange): Promise<PaymentMixRow[]>;
  pendingExposure(range?: AnalyticsDateRange): Promise<PendingExposureRow[]>;
}
