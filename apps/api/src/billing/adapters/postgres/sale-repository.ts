import { Inject, Injectable } from "@nestjs/common";
import type { Pool, PoolClient } from "pg";
import type { Sale } from "@kutana/shared/billing/model/sale.js";
import type { SaleRepository } from "@kutana/shared/billing/ports/sale-repository.js";
import { ConflictError } from "@kutana/shared/errors/conflict-error.js";
import { PostgresPool } from "../../../infrastructure/postgres/postgres-pool.js";

interface SaleRow {
  id: string;
  public_uuid: string;
  order_id: string;
  completed_at: Date | string;
  currency_code: Sale["currencyCode"];
  subtotal_cents: number;
  tax_total_cents: number;
  discount_total_cents: number;
  total_cents: number;
  paid_cents: number;
  pending_cents: number;
  status: Sale["status"];
  table_id: string | null;
  opened_at: Date | string | null;
  closed_at: Date | string;
  closed_by_user_id: string | null;
  customer_id: string | null;
}

interface SaleItemRow {
  id: string;
  sale_id: string;
  order_line_item_id: string | null;
  product_id: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
  tax_cents: number;
  discount_cents: number;
  total_cents: number;
  account_id: string | null;
  customer_id: string | null;
}

interface SaleSettlementRow {
  id: string;
  sale_id: string;
  method_code: string;
  amount_cents: number;
  tendered_cents: number | null;
  change_cents: number | null;
  settled_at: Date | string;
  account_id: string | null;
  customer_id: string | null;
}

const iso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const saleColumns =
  "id, public_uuid, order_id, completed_at, currency_code, subtotal_cents, tax_total_cents, discount_total_cents, total_cents, paid_cents, pending_cents, status, table_id, opened_at, closed_at, closed_by_user_id, customer_id";

async function loadSale(
  executor: Pool | PoolClient,
  predicate: string,
  value: string,
): Promise<Sale | null> {
  const result = await executor.query<SaleRow>(
    `SELECT ${saleColumns} FROM sales WHERE ${predicate} = $1`,
    [value],
  );
  const row = result.rows[0];
  if (!row) return null;

  const [items, settlements] = await Promise.all([
    executor.query<SaleItemRow>(
      `SELECT id, sale_id, order_line_item_id, product_id, name, quantity::float8 AS quantity,
              unit_price_cents, subtotal_cents, tax_cents, discount_cents, total_cents, account_id, customer_id
       FROM sale_items WHERE sale_id = $1 ORDER BY id`,
      [row.id],
    ),
    executor.query<SaleSettlementRow>(
      `SELECT id, sale_id, method_code, amount_cents, tendered_cents, change_cents, settled_at, account_id, customer_id
       FROM sale_settlements WHERE sale_id = $1 ORDER BY settled_at, id`,
      [row.id],
    ),
  ]);

  return {
    id: row.id,
    publicUuid: row.public_uuid,
    orderId: row.order_id,
    completedAt: iso(row.completed_at),
    currencyCode: row.currency_code,
    subtotalCents: row.subtotal_cents,
    taxTotalCents: row.tax_total_cents,
    discountTotalCents: row.discount_total_cents,
    totalCents: row.total_cents,
    paidCents: row.paid_cents,
    pendingCents: row.pending_cents,
    status: row.status,
    tableId: row.table_id,
    openedAt: row.opened_at === null ? null : iso(row.opened_at),
    closedAt: iso(row.closed_at),
    closedByUserId: row.closed_by_user_id,
    customerId: row.customer_id,
    items: items.rows.map((item) => ({
      id: item.id,
      saleId: item.sale_id,
      orderLineItemId: item.order_line_item_id ?? undefined,
      productId: item.product_id,
      name: item.name,
      quantity: item.quantity,
      unitPriceCents: item.unit_price_cents,
      subtotalCents: item.subtotal_cents,
      taxCents: item.tax_cents,
      discountCents: item.discount_cents,
      totalCents: item.total_cents,
      ...(item.account_id === null ? {} : { accountId: item.account_id }),
      ...(item.customer_id === null ? {} : { customerId: item.customer_id }),
    })),
    settlements: settlements.rows.map((settlement) => ({
      id: settlement.id,
      saleId: settlement.sale_id,
      methodCode: settlement.method_code,
      amountCents: settlement.amount_cents,
      tenderedCents: settlement.tendered_cents,
      changeCents: settlement.change_cents,
      settledAt: iso(settlement.settled_at),
      ...(settlement.account_id === null ? {} : { accountId: settlement.account_id }),
      ...(settlement.customer_id === null ? {} : { customerId: settlement.customer_id }),
    })),
  };
}

const sameSnapshot = (left: Sale, right: Sale): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

@Injectable()
export class PostgresSaleRepository implements SaleRepository {
  constructor(@Inject(PostgresPool) private readonly pool: Pool) {}

  findByPublicUuid(publicUuid: string): Promise<Sale | null> {
    return loadSale(this.pool, "public_uuid", publicUuid);
  }

  findByOrderId(orderId: string): Promise<Sale | null> {
    return loadSale(this.pool, "order_id", orderId);
  }

  async create(sale: Sale): Promise<Sale> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await loadSale(client, "order_id", sale.orderId);
      if (existing) {
        if (!sameSnapshot(existing, sale)) {
          throw new ConflictError(
            `Sale already exists for order ${sale.orderId} with a different snapshot`,
            existing,
          );
        }
        await client.query("COMMIT");
        return existing;
      }

      await client.query(
        `INSERT INTO sales (${saleColumns})
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          sale.id,
          sale.publicUuid,
          sale.orderId,
          sale.completedAt,
          sale.currencyCode,
          sale.subtotalCents,
          sale.taxTotalCents,
          sale.discountTotalCents,
          sale.totalCents,
          sale.paidCents,
          sale.pendingCents,
          sale.status,
          sale.tableId,
          sale.openedAt,
          sale.closedAt,
          sale.closedByUserId,
          sale.customerId,
        ],
      );
      for (const item of sale.items) {
        await client.query(
          `INSERT INTO sale_items
           (id, sale_id, order_line_item_id, product_id, name, quantity, unit_price_cents, subtotal_cents, tax_cents, discount_cents, total_cents, account_id, customer_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            item.id,
            sale.id,
            item.orderLineItemId ?? null,
            item.productId,
            item.name,
            item.quantity,
            item.unitPriceCents,
            item.subtotalCents,
            item.taxCents,
            item.discountCents,
            item.totalCents,
            item.accountId ?? null,
            item.customerId ?? null,
          ],
        );
      }
      for (const settlement of sale.settlements) {
        await client.query(
          `INSERT INTO sale_settlements
           (id, sale_id, method_code, amount_cents, tendered_cents, change_cents, settled_at, account_id, customer_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            settlement.id,
            sale.id,
            settlement.methodCode,
            settlement.amountCents,
            settlement.tenderedCents,
            settlement.changeCents,
            settlement.settledAt,
            settlement.accountId ?? null,
            settlement.customerId ?? null,
          ],
        );
      }
      await client.query("COMMIT");
      return sale;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
