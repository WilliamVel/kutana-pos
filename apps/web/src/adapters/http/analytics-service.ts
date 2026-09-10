import type {
  AnalyticsDateRange,
  DailySalesTotal,
  PaymentMixRow,
  PendingExposureRow,
  ProductMixRow,
} from "@kutana/shared/analytics/model/analytics.js";
import type { AnalyticsReadPort } from "@kutana/shared/analytics/ports/analytics-service.js";
import { HttpClient, type HttpClientOptions } from "./http-client.js";

export class HttpAnalyticsService implements AnalyticsReadPort {
  private readonly http: HttpClient;
  constructor(options: HttpClientOptions = {}) {
    this.http = new HttpClient(options);
  }
  dailySales(range?: AnalyticsDateRange): Promise<DailySalesTotal[]> {
    return this.http.request("/billing/analytics/daily-sales", {
      query: range ? { from: range.from, to: range.to } : undefined,
    });
  }
  productMix(range?: AnalyticsDateRange): Promise<ProductMixRow[]> {
    return this.http.request("/billing/analytics/product-mix", {
      query: range ? { from: range.from, to: range.to } : undefined,
    });
  }
  paymentMix(range?: AnalyticsDateRange): Promise<PaymentMixRow[]> {
    return this.http.request("/billing/analytics/payment-mix", {
      query: range ? { from: range.from, to: range.to } : undefined,
    });
  }
  pendingExposure(range?: AnalyticsDateRange): Promise<PendingExposureRow[]> {
    return this.http.request("/billing/analytics/pending-exposure", {
      query: range ? { from: range.from, to: range.to } : undefined,
    });
  }
}
