import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import type {
  AnalyticsDateRange,
  AnalyticsPageQuery,
  AnalyticsProductSort,
  DailySalesPage,
  DailySalesTotal,
  PaymentMixRow,
  PendingExposureRow,
  ProductMixPage,
  ProductMixRow,
} from "@kutana/shared/analytics/model/analytics.js";
import { PostgresPool } from "../infrastructure/postgres/postgres-pool.js";

export type AnalyticsDateQuery = AnalyticsDateRange;
export type { DailySalesPage, DailySalesTotal, PaymentMixRow, PendingExposureRow, ProductMixPage, ProductMixRow };
export interface AnalyticsSummary { readonly timezone: "America/Guayaquil"; readonly currencyCode: "USD"; readonly from: string | null; readonly to: string | null; readonly grossSalesCents: number; readonly collectedCents: number; readonly orderCount: number; readonly averageOrderCents: number | null; readonly trendGranularity: "day" | "week" | "month"; readonly dailySales: DailySalesTotal[]; readonly productMix: ProductMixRow[]; readonly paymentMix: PaymentMixRow[]; readonly pendingExposure: PendingExposureRow[]; }
interface AnalyticsRow { date?: string; currency_code: string; total_cents?: number | string; gross_sales_cents?: number | string; collected_cents?: number | string; order_count?: number | string; average_order_cents?: number | string | null; product_id?: string; name?: string; presentation_size?: string | null; quantity?: number | string; revenue_cents?: number | string; method_code?: string; method_label?: string; amount_cents?: number | string; customer_id?: string | null; account_id?: string | null; pending_cents?: number | string; }
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366;
export function analyticsDateParams(query: AnalyticsDateRange): [string | null, string | null] {
  const from = validateDate(query.from, "from"); const to = validateDate(query.to, "to");
  if (from && to && from > to) throw new BadRequestException("from must be on or before to");
  if (from && to && (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000 + 1 > MAX_RANGE_DAYS) throw new BadRequestException(`date range must not exceed ${MAX_RANGE_DAYS} days`);
  return [from ?? null, to ?? null];
}
function validateDate(value: string | undefined, name: string): string | undefined { if (value === undefined) return undefined; if (!DATE_PATTERN.test(value)) throw new BadRequestException(`${name} must be an ISO date (YYYY-MM-DD)`); const parsed = new Date(`${value}T00:00:00.000Z`); if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new BadRequestException(`${name} must be a valid ISO date (YYYY-MM-DD)`); return value; }
function pageParams(query: AnalyticsPageQuery): { page: number; pageSize: number } { const page = query.page ?? 0; const pageSize = query.pageSize ?? 10; if (!Number.isInteger(page) || page < 0 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new BadRequestException("page must be >= 0 and pageSize must be between 1 and 100"); return { page, pageSize }; }
const datePredicate = "($1::date IS NULL OR s.completed_at >= ($1::date AT TIME ZONE 'America/Guayaquil')) AND ($2::date IS NULL OR s.completed_at < (($2::date + INTERVAL '1 day') AT TIME ZONE 'America/Guayaquil'))";
const asNumber = (value: number | string | null | undefined): number => Number(value ?? 0);

function compactTrend(rows: readonly DailySalesTotal[]): { rows: DailySalesTotal[]; granularity: "day" | "week" | "month" } {
  const granularity = rows.length > 180 ? "month" : rows.length > 45 ? "week" : "day";
  if (granularity === "day") return { rows: [...rows], granularity };
  const grouped = new Map<string, DailySalesTotal>();
  for (const row of rows) {
    const date = new Date(`${row.date}T00:00:00Z`);
    if (granularity === "month") date.setUTCDate(1);
    else {
      const mondayOffset = (date.getUTCDay() + 6) % 7;
      date.setUTCDate(date.getUTCDate() - mondayOffset);
    }
    const key = date.toISOString().slice(0, 10);
    const current = grouped.get(key);
    grouped.set(key, { date: key, currencyCode: row.currencyCode, totalCents: (current?.totalCents ?? 0) + row.totalCents });
  }
  return { rows: [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date)), granularity };
}

@Injectable()
export class SalesAnalyticsService {
  constructor(@Inject(PostgresPool) private readonly pool: Pool) {}
  async summary(query: AnalyticsDateQuery = {}): Promise<AnalyticsSummary> {
    const params = analyticsDateParams(query);
    const [summary, daily, products, payments, pending] = await Promise.all([this.pool.query<AnalyticsRow>(`SELECT COALESCE(SUM(s.total_cents), 0)::bigint AS gross_sales_cents, COALESCE(SUM(s.paid_cents), 0)::bigint AS collected_cents, COUNT(*)::bigint AS order_count, CASE WHEN COUNT(*) = 0 THEN NULL ELSE (SUM(s.total_cents)::numeric / COUNT(*))::bigint END AS average_order_cents FROM sales s WHERE ${datePredicate}`, params), this.dailySales(query), this.productMix(query), this.paymentMix(query), this.pendingExposure(query)]);
    const row = summary.rows[0];
    const trend = compactTrend(daily);
    return { timezone: "America/Guayaquil", currencyCode: "USD", from: query.from ?? null, to: query.to ?? null, grossSalesCents: asNumber(row?.gross_sales_cents), collectedCents: asNumber(row?.collected_cents), orderCount: asNumber(row?.order_count), averageOrderCents: row?.average_order_cents == null ? null : asNumber(row.average_order_cents), trendGranularity: trend.granularity, dailySales: trend.rows, productMix: products, paymentMix: payments, pendingExposure: pending };
  }
  async dailySales(query: AnalyticsDateQuery = {}): Promise<DailySalesTotal[]> {
    const result = await this.pool.query<AnalyticsRow>(`WITH bounds AS (SELECT COALESCE($1::date, MIN((s.completed_at AT TIME ZONE 'America/Guayaquil')::date)) AS from_date, COALESCE($2::date, MAX((s.completed_at AT TIME ZONE 'America/Guayaquil')::date), $1::date) AS to_date FROM sales s), days AS (SELECT generate_series(bounds.from_date, bounds.to_date, INTERVAL '1 day')::date AS date FROM bounds), totals AS (SELECT (s.completed_at AT TIME ZONE 'America/Guayaquil')::date AS date, SUM(s.total_cents)::bigint AS total_cents FROM sales s WHERE ${datePredicate} GROUP BY 1) SELECT days.date::text AS date, 'USD' AS currency_code, COALESCE(totals.total_cents, 0)::bigint AS total_cents FROM days LEFT JOIN totals ON totals.date = days.date ORDER BY days.date`, analyticsDateParams(query));
    return result.rows.map((row) => ({ date: row.date!, currencyCode: row.currency_code, totalCents: asNumber(row.total_cents) }));
  }
  async dailyDetail(query: AnalyticsPageQuery = {}): Promise<DailySalesPage> {
    const { page, pageSize } = pageParams(query);
    const [from, to] = analyticsDateParams(query);
    const rows = await this.pool.query<AnalyticsRow>(`WITH bounds AS (SELECT COALESCE($1::date, MIN((s.completed_at AT TIME ZONE 'America/Guayaquil')::date)) AS from_date, COALESCE($2::date, MAX((s.completed_at AT TIME ZONE 'America/Guayaquil')::date), $1::date) AS to_date FROM sales s), days AS (SELECT generate_series(bounds.from_date, bounds.to_date, INTERVAL '1 day')::date AS date FROM bounds), totals AS (SELECT (s.completed_at AT TIME ZONE 'America/Guayaquil')::date AS date, SUM(s.total_cents)::bigint AS total_cents FROM sales s WHERE ${datePredicate} GROUP BY 1) SELECT days.date::text AS date, 'USD' AS currency_code, COALESCE(totals.total_cents, 0)::bigint AS total_cents FROM days LEFT JOIN totals ON totals.date = days.date ORDER BY days.date LIMIT $3 OFFSET $4`, [from, to, pageSize, page * pageSize]);
    const count = await this.pool.query<{ total: number | string }>(`WITH bounds AS (SELECT COALESCE($1::date, MIN((s.completed_at AT TIME ZONE 'America/Guayaquil')::date)) AS from_date, COALESCE($2::date, MAX((s.completed_at AT TIME ZONE 'America/Guayaquil')::date), $1::date) AS to_date FROM sales s) SELECT COUNT(*)::bigint AS total FROM bounds, LATERAL generate_series(bounds.from_date, bounds.to_date, INTERVAL '1 day') days(day)`, [from, to]);
    return { rows: rows.rows.map((row) => ({ date: row.date!, currencyCode: row.currency_code, totalCents: asNumber(row.total_cents) })), total: asNumber(count.rows[0]?.total), page, pageSize, granularity: "day" };
  }
  async productMix(query: AnalyticsDateQuery = {}): Promise<ProductMixRow[]> { return this.productRows(query, 5, 0, undefined); }
  async productDetail(query: AnalyticsPageQuery = {}): Promise<ProductMixPage> { const { page, pageSize } = pageParams(query); const rows = await this.productRows(query, pageSize, page * pageSize, query.search, query.sort); const count = await this.productCount(query); return { rows, total: count, page, pageSize }; }
  private async productRows(query: AnalyticsDateRange, limit: number, offset: number, search?: string, sort: AnalyticsProductSort = "revenue"): Promise<ProductMixRow[]> { const [from, to] = analyticsDateParams(query); const order = sort === "quantity" ? "quantity DESC, si.name ASC, si.product_id ASC" : "revenue_cents DESC, si.name ASC, si.product_id ASC"; const result = await this.pool.query<AnalyticsRow>(`SELECT si.product_id, si.name, NULL::text AS presentation_size, s.currency_code, SUM(si.quantity)::float8 AS quantity, SUM(si.total_cents)::bigint AS revenue_cents FROM sale_items si JOIN sales s ON s.id = si.sale_id WHERE ${datePredicate} AND ($3::text IS NULL OR si.name ILIKE '%' || $3 || '%') GROUP BY si.product_id, si.name, s.currency_code ORDER BY ${order} LIMIT $4 OFFSET $5`, [from, to, search?.trim() || null, limit, offset]); return result.rows.map((row) => ({ productId: row.product_id!, name: row.name!, presentationSize: row.presentation_size ?? null, currencyCode: row.currency_code, quantity: asNumber(row.quantity), revenueCents: asNumber(row.revenue_cents) })); }
  private async productCount(query: AnalyticsPageQuery): Promise<number> { const [from, to] = analyticsDateParams(query); const result = await this.pool.query<{ total: number | string }>(`SELECT COUNT(*)::bigint AS total FROM (SELECT si.product_id, si.name FROM sale_items si JOIN sales s ON s.id = si.sale_id WHERE ${datePredicate} AND ($3::text IS NULL OR si.name ILIKE '%' || $3 || '%') GROUP BY si.product_id, si.name) products`, [from, to, query.search?.trim() || null]); return asNumber(result.rows[0]?.total); }
  async paymentMix(query: AnalyticsDateQuery = {}): Promise<PaymentMixRow[]> { const result = await this.pool.query<AnalyticsRow>(`SELECT ss.method_code, COALESCE(pm.label, ss.method_code) AS method_label, s.currency_code, SUM(ss.amount_cents)::bigint AS amount_cents FROM sale_settlements ss JOIN sales s ON s.id = ss.sale_id LEFT JOIN payment_methods pm ON pm.code = ss.method_code WHERE ${datePredicate} GROUP BY ss.method_code, pm.label, s.currency_code ORDER BY amount_cents DESC, method_label`, analyticsDateParams(query)); return result.rows.map((row) => ({ methodCode: row.method_code!, methodLabel: row.method_label ?? row.method_code!, currencyCode: row.currency_code, amountCents: asNumber(row.amount_cents) })); }
  async pendingExposure(query: AnalyticsDateQuery = {}): Promise<PendingExposureRow[]> { const result = await this.pool.query<AnalyticsRow>(`SELECT s.customer_id, exposure.account_id, s.currency_code, SUM(s.pending_cents)::bigint AS pending_cents FROM sales s LEFT JOIN LATERAL (SELECT MIN(si.account_id) AS account_id FROM sale_items si WHERE si.sale_id = s.id AND si.account_id IS NOT NULL) exposure ON true WHERE s.pending_cents > 0 AND ${datePredicate} GROUP BY s.customer_id, exposure.account_id, s.currency_code ORDER BY pending_cents DESC`, analyticsDateParams(query)); return result.rows.map((row) => ({ customerId: row.customer_id ?? null, accountId: row.account_id ?? null, currencyCode: row.currency_code, pendingCents: asNumber(row.pending_cents) })); }
}
