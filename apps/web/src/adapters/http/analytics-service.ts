import type { AnalyticsDateRange, AnalyticsPageQuery, AnalyticsSummary, DailySalesPage, DailySalesTotal, PaymentMixRow, PendingExposureRow, ProductMixPage, ProductMixRow } from "@kutana/shared/analytics/model/analytics.js";
import type { AnalyticsReadPort } from "@kutana/shared/analytics/ports/analytics-service.js";
import { HttpClient, type HttpClientOptions } from "./http-client.js";

export class HttpAnalyticsService implements AnalyticsReadPort {
  private readonly http: HttpClient;
  constructor(options: HttpClientOptions = {}) { this.http = new HttpClient(options); }
  summary(range?: AnalyticsDateRange): Promise<AnalyticsSummary> { return this.http.request("/billing/analytics/summary", { query: range ? { from: range.from, to: range.to } : undefined }); }
  dailySales(range?: AnalyticsDateRange): Promise<DailySalesTotal[]> { return this.http.request("/billing/analytics/daily-sales", { query: range ? { from: range.from, to: range.to } : undefined }); }
  dailyDetail(query: AnalyticsPageQuery = {}): Promise<DailySalesPage> { return this.http.request("/billing/analytics/daily-sales-detail", { query: pageQuery(query) }); }
  productMix(range?: AnalyticsDateRange): Promise<ProductMixRow[]> { return this.http.request("/billing/analytics/product-mix", { query: range ? { from: range.from, to: range.to } : undefined }); }
  productDetail(query: AnalyticsPageQuery = {}): Promise<ProductMixPage> { return this.http.request("/billing/analytics/products", { query: pageQuery(query) }); }
  paymentMix(range?: AnalyticsDateRange): Promise<PaymentMixRow[]> { return this.http.request("/billing/analytics/payment-mix", { query: range ? { from: range.from, to: range.to } : undefined }); }
  pendingExposure(range?: AnalyticsDateRange): Promise<PendingExposureRow[]> { return this.http.request("/billing/analytics/pending-exposure", { query: range ? { from: range.from, to: range.to } : undefined }); }
}

function pageQuery(query: AnalyticsPageQuery): Record<string, string | number | undefined> {
  return { from: query.from, to: query.to, search: query.search, sort: query.sort, page: query.page, pageSize: query.pageSize };
}
