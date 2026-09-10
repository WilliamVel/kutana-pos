import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { PostgresPool } from "../infrastructure/postgres/postgres-pool.js";

export interface AnalyticsDateQuery {
  readonly from?: string;
  readonly to?: string;
}

export interface DailySalesTotal {
  readonly date: string;
  readonly currencyCode: string;
  readonly totalCents: number;
}

export interface ProductMixRow {
  readonly productId: string;
  readonly name: string;
  readonly quantity: number;
  readonly revenueCents: number;
  readonly currencyCode: string;
}

export interface PaymentMixRow {
  readonly methodCode: string;
  readonly amountCents: number;
  readonly currencyCode: string;
}

export interface PendingExposureRow {
  readonly customerId: string | null;
  readonly accountId: string | null;
  readonly pendingCents: number;
  readonly currencyCode: string;
}

interface AnalyticsRow {
  date?: string;
  currency_code: string;
  total_cents?: number | string;
  product_id?: string;
  name?: string;
  quantity?: number | string;
  revenue_cents?: number | string;
  method_code?: string;
  amount_cents?: number | string;
  customer_id?: string | null;
  account_id?: string | null;
  pending_cents?: number | string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function analyticsDateParams(query: AnalyticsDateQuery): Array<string | null> {
  const from = validateDate(query.from, "from");
  const to = validateDate(query.to, "to");
  if (from && to && from > to) {
    throw new BadRequestException("from must be on or before to");
  }
  return [from ?? null, to ?? null];
}

function validateDate(value: string | undefined, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (!DATE_PATTERN.test(value)) {
    throw new BadRequestException(`${name} must be an ISO date (YYYY-MM-DD)`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException(`${name} must be a valid ISO date (YYYY-MM-DD)`);
  }
  return value;
}

const datePredicate =
  "($1::date IS NULL OR s.completed_at >= $1::date) AND ($2::date IS NULL OR s.completed_at < ($2::date + INTERVAL '1 day'))";
const asCents = (value: number | string | undefined): number => Number(value ?? 0);

@Injectable()
export class SalesAnalyticsService {
  constructor(@Inject(PostgresPool) private readonly pool: Pool) {}

  async dailySales(query: AnalyticsDateQuery = {}): Promise<DailySalesTotal[]> {
    const result = await this.pool.query<AnalyticsRow>(
      `SELECT s.completed_at::date::text AS date, s.currency_code,
              SUM(s.total_cents)::bigint AS total_cents
       FROM sales s WHERE ${datePredicate}
       GROUP BY s.completed_at::date, s.currency_code
       ORDER BY date, s.currency_code`,
      analyticsDateParams(query),
    );
    return result.rows.map((row) => ({
      date: row.date!, currencyCode: row.currency_code, totalCents: asCents(row.total_cents),
    }));
  }

  async productMix(query: AnalyticsDateQuery = {}): Promise<ProductMixRow[]> {
    const result = await this.pool.query<AnalyticsRow>(
      `SELECT si.product_id, si.name, s.currency_code,
              SUM(si.quantity)::float8 AS quantity,
              SUM(si.total_cents)::bigint AS revenue_cents
       FROM sale_items si JOIN sales s ON s.id = si.sale_id
       WHERE ${datePredicate}
       GROUP BY si.product_id, si.name, s.currency_code
       ORDER BY si.product_id, si.name, s.currency_code`,
      analyticsDateParams(query),
    );
    return result.rows.map((row) => ({
      productId: row.product_id!, name: row.name!, currencyCode: row.currency_code,
      quantity: asCents(row.quantity), revenueCents: asCents(row.revenue_cents),
    }));
  }

  async paymentMix(query: AnalyticsDateQuery = {}): Promise<PaymentMixRow[]> {
    const result = await this.pool.query<AnalyticsRow>(
      `SELECT ss.method_code, s.currency_code,
              SUM(ss.amount_cents)::bigint AS amount_cents
       FROM sale_settlements ss JOIN sales s ON s.id = ss.sale_id
       WHERE ${datePredicate}
       GROUP BY ss.method_code, s.currency_code
       ORDER BY ss.method_code, s.currency_code`,
      analyticsDateParams(query),
    );
    return result.rows.map((row) => ({
      methodCode: row.method_code!, currencyCode: row.currency_code,
      amountCents: asCents(row.amount_cents),
    }));
  }

  async pendingExposure(query: AnalyticsDateQuery = {}): Promise<PendingExposureRow[]> {
    const result = await this.pool.query<AnalyticsRow>(
      `SELECT s.customer_id, exposure.account_id, s.currency_code,
              SUM(s.pending_cents)::bigint AS pending_cents
       FROM sales s
       LEFT JOIN LATERAL (
         SELECT MIN(si.account_id) AS account_id
         FROM sale_items si WHERE si.sale_id = s.id AND si.account_id IS NOT NULL
       ) exposure ON true
       WHERE s.pending_cents > 0 AND ${datePredicate}
       GROUP BY s.customer_id, exposure.account_id, s.currency_code
       ORDER BY s.customer_id NULLS LAST, exposure.account_id NULLS LAST, s.currency_code`,
      analyticsDateParams(query),
    );
    return result.rows.map((row) => ({
      customerId: row.customer_id ?? null, accountId: row.account_id ?? null,
      currencyCode: row.currency_code, pendingCents: asCents(row.pending_cents),
    }));
  }
}
