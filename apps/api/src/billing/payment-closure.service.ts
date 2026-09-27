import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Pool } from "pg";
import { closeOrderWithPersonalAccounts } from "@kutana/shared/billing/model/order-closure.js";
import { createSale, type Sale } from "@kutana/shared/billing/model/sale.js";
import { accountBalance, derivePersonalAccountStatus, type PersonalAccount } from "@kutana/shared/billing/model/personal-account.js";
import { validateSaleReconciliation } from "@kutana/shared/billing/services/sale-snapshot.js";
import { createUuid } from "@kutana/shared/platform/uuid.js";
import { PostgresPool } from "../infrastructure/postgres/postgres-pool.js";

interface OrderRow { id: string; table_id: string; status: "active" | "needs_check" | "in_review" | "paid" | "closed_with_pending"; opened_at: Date | string; closed_at: Date | string | null; customer_id: string | null; version: number; }
interface LineRow { id: string; order_id: string; product_id: string; name_snapshot: string; unit_price_cents: number; quantity: string | number; tax_cents: number; total_cents: number; created_at: Date | string; position: number; }
interface AccountRow { id: string; order_id: string; customer_id: string | null; free_name: string | null; status: PersonalAccount["status"]; created_at: Date | string; closed_at: Date | string | null; version: number; }
interface AllocationRow { id: string; account_id: string; line_item_id: string; quantity: string | number; }
interface TicketAllocationRow { id: string; ticket_id: string; line_item_id: string; share_bp: number; }
interface PaymentRow { id: string; account_id: string | null; customer_id: string | null; ticket_id: string | null; method_code: string; amount_cents: number; tendered_cents: number | null; change_cents: number | null; recorded_at: Date | string; }
interface SaleRow { id: string; public_uuid: string; order_id: string; completed_at: Date | string; currency_code: "USD"; subtotal_cents: number; tax_total_cents: number; discount_total_cents: number; total_cents: number; paid_cents: number; pending_cents: number; status: "paid" | "pending"; table_id: string | null; opened_at: Date | string | null; closed_at: Date | string; closed_by_user_id: string | null; customer_id: string | null; }
interface SaleItemRow { id: string; sale_id: string; order_line_item_id: string | null; product_id: string; name: string; quantity: number; unit_price_cents: number; subtotal_cents: number; tax_cents: number; discount_cents: number; total_cents: number; account_id: string | null; customer_id: string | null; }
interface SaleSettlementRow { id: string; sale_id: string; method_code: string; amount_cents: number; tendered_cents: number | null; change_cents: number | null; settled_at: Date | string; account_id: string | null; customer_id: string | null; }
const iso = (value: Date | string): string => value instanceof Date ? value.toISOString() : new Date(value).toISOString();

@Injectable()
export class PaymentClosureService {
  constructor(@Inject(PostgresPool) private readonly pool: Pool) {}

  async closeOrder(orderId: string, operatorId: string): Promise<Sale> {
    if (!operatorId?.trim()) throw new ConflictException("Authenticated operator is required");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const orderResult = await client.query<OrderRow>("SELECT id, table_id, status, opened_at, closed_at, customer_id, version FROM orders WHERE id = $1 FOR UPDATE", [orderId]);
      const row = orderResult.rows[0];
      if (!row) throw new NotFoundException(`Order ${orderId} not found`);

      const existing = await client.query<{ id: string }>("SELECT id FROM sales WHERE order_id = $1 FOR UPDATE", [orderId]);
      if (existing.rows[0]) {
        await client.query("COMMIT");
        const result = await this.pool.query<SaleRow>("SELECT id, public_uuid, order_id, completed_at, currency_code, subtotal_cents, tax_total_cents, discount_total_cents, total_cents, paid_cents, pending_cents, status, table_id, opened_at, closed_at, closed_by_user_id, customer_id FROM sales WHERE order_id = $1", [orderId]);
        if (!result.rows[0]) throw new Error(`Sale for order ${orderId} disappeared after commit`);
        return this.loadSale(this.pool, result.rows[0]);
      }

      const lines = (await client.query<LineRow>("SELECT id, order_id, product_id, name_snapshot, unit_price_cents, quantity, tax_cents, total_cents, created_at, position FROM line_items WHERE order_id = $1 ORDER BY position", [orderId])).rows;
      const accounts = (await client.query<AccountRow>("SELECT id, order_id, customer_id, free_name, status, created_at, closed_at, version FROM personal_accounts WHERE order_id = $1 ORDER BY id FOR UPDATE", [orderId])).rows;
      const allocations = (await client.query<AllocationRow>("SELECT a.id, a.account_id, a.line_item_id, a.quantity FROM account_line_allocations a INNER JOIN personal_accounts p ON p.id = a.account_id WHERE p.order_id = $1 ORDER BY a.line_item_id, a.id FOR UPDATE", [orderId])).rows;
      const accountIds = accounts.map((account) => account.id);
      await client.query("SELECT id FROM tickets WHERE order_id = $1 FOR UPDATE", [orderId]);
      const ticketAllocations = (await client.query<TicketAllocationRow>(
        "SELECT id, ticket_id, line_item_id, share_bp FROM allocations WHERE ticket_id IN (SELECT id FROM tickets WHERE order_id = $1) ORDER BY line_item_id, id",
        [orderId],
      )).rows;
      const payments = (await client.query<PaymentRow>(
        "SELECT id, account_id, customer_id, ticket_id, method_code, amount_cents, tendered_cents, change_cents, recorded_at FROM payments WHERE account_id = ANY($1::text[]) OR ticket_id IN (SELECT id FROM tickets WHERE order_id = $2) ORDER BY recorded_at, id FOR UPDATE",
        [accountIds, orderId],
      )).rows;

      const domainOrder = { id: row.id, tableId: row.table_id, status: row.status, lineItems: lines.map((line) => ({ id: line.id, orderId: line.order_id, productId: line.product_id, nameSnapshot: line.name_snapshot, unitPriceCents: line.unit_price_cents, quantity: Number(line.quantity), pourSizeMl: null, taxRateBp: 0, taxCents: line.tax_cents, totalCents: line.total_cents, isAdjustment: false, createdAt: iso(line.created_at), position: line.position })), openedAt: iso(row.opened_at), closedAt: row.closed_at ? iso(row.closed_at) : null, customerId: row.customer_id, version: row.version };
      const domainAccounts: PersonalAccount[] = accounts.map((account) => ({ id: account.id, orderId: account.order_id, owner: account.customer_id ? { kind: "customer", customerId: account.customer_id } : { kind: "free_name", freeName: account.free_name ?? "" }, status: account.status, createdAt: iso(account.created_at), closedAt: account.closed_at ? iso(account.closed_at) : null, version: account.version }));
      const accountAllocatedLineItemIds = new Set(allocations.map((allocation) => allocation.line_item_id));
      const closure = closeOrderWithPersonalAccounts({
        order: domainOrder,
        accounts: domainAccounts,
        allocations: [
          ...allocations.map((a) => ({ id: a.id, accountId: a.account_id, lineItemId: a.line_item_id, quantity: Number(a.quantity) })),
          // Account allocations supersede the legacy ticket allocation for a
          // line; counting both would make a paid split look over-assigned.
          ...ticketAllocations
            .filter((a) => !accountAllocatedLineItemIds.has(a.line_item_id))
            .map((a) => ({ id: a.id, accountId: `ticket:${a.ticket_id}`, lineItemId: a.line_item_id, quantity: a.share_bp / 10_000 })),
        ],
        payments: payments.filter((p) => p.account_id !== null).map((p) => ({ accountId: p.account_id!, amountCents: p.amount_cents })),
      });
      if (closure.kind !== "closed") {
        throw new ConflictException({
          code: "ORDER_REVIEW_REQUIRED",
          message: "Order requires review before closure",
          unresolvedLineItems: closure.unresolvedLineItems.map((item) => ({
            lineItemId: item.lineItemId,
            unresolvedQuantity: item.unresolvedQuantity,
          })),
          blockingAccounts: closure.blockingAccounts.map((account) => ({
            accountId: account.accountId,
            status: account.status,
            remainingCents: account.remainingCents,
          })),
        });
      }

      const closedAt = closure.order.closedAt!;
      const accountById = new Map(domainAccounts.map((account) => [account.id, account]));
      const allocationDomain = allocations.map((a) => ({ id: a.id, accountId: a.account_id, lineItemId: a.line_item_id, quantity: Number(a.quantity) }));
      for (const account of domainAccounts) {
        const balance = accountBalance({ accountId: account.id, lineItems: domainOrder.lineItems, allocations: allocationDomain, payments: payments.filter((p) => p.account_id !== null).map((p) => ({ accountId: p.account_id!, amountCents: p.amount_cents })) });
        const pending = account.status === "pending";
        const nextStatus = derivePersonalAccountStatus({ totalCents: balance.totalCents, paidCents: balance.paidCents, isPending: pending });
        await client.query("UPDATE personal_accounts SET status = $1, closed_at = $2, version = version + 1 WHERE id = $3", [nextStatus, closedAt, account.id]);
        if (pending && balance.remainingCents > 0 && account.owner.kind === "customer") {
          const debt = await client.query<{ id: string }>("SELECT id FROM customer_debt_ledger WHERE account_id = $1 AND kind = 'pending_account' AND direction = 'debit' FOR UPDATE", [account.id]);
          if (!debt.rows[0]) await client.query("INSERT INTO customer_debt_ledger (id, customer_id, kind, direction, amount_cents, account_id, payment_id, note, created_at) VALUES ($1, $2, 'pending_account', 'debit', $3, $4, NULL, NULL, $5)", [createUuid(), account.owner.customerId, balance.remainingCents, account.id, closedAt]);
        }
      }

      const items = lines.map((line) => {
        const assigned = allocations.filter((a) => a.line_item_id === line.id);
        const account = assigned.length === 1 ? accountById.get(assigned[0]!.account_id) : undefined;
        return { id: createUuid(), saleId: "", orderLineItemId: line.id, productId: line.product_id, name: line.name_snapshot, quantity: Number(line.quantity), unitPriceCents: line.unit_price_cents, subtotalCents: line.total_cents - line.tax_cents, taxCents: line.tax_cents, discountCents: 0, totalCents: line.total_cents, ...(account?.owner.kind === "customer" ? { accountId: account.id, customerId: account.owner.customerId } : {}) };
      });
      const settlements = payments.map((payment) => ({ id: createUuid(), saleId: "", methodCode: payment.method_code, amountCents: payment.amount_cents, tenderedCents: payment.tendered_cents, changeCents: payment.change_cents, settledAt: iso(payment.recorded_at), ...(payment.account_id ? { accountId: payment.account_id } : {}), ...(payment.customer_id ? { customerId: payment.customer_id } : {}) }));
      const totalCents = lines.reduce((sum, line) => sum + line.total_cents, 0);
      const paidCents = settlements.reduce((sum, settlement) => sum + settlement.amountCents, 0);
      const pendingCents = totalCents - paidCents;
      const sale = createSale({ orderId, totalCents, taxTotalCents: lines.reduce((sum, line) => sum + line.tax_cents, 0), paidCents, pendingCents, closedAt, openedAt: iso(row.opened_at), tableId: row.table_id, closedByUserId: operatorId, customerId: row.customer_id, items, settlements, status: closure.pendingAccountIds.length ? "pending" : "paid" });
      const fixedSale = { ...sale, items: sale.items.map((item) => ({ ...item, saleId: sale.id })), settlements: sale.settlements.map((settlement) => ({ ...settlement, saleId: sale.id })) };
      validateSaleReconciliation(fixedSale);
      await client.query("INSERT INTO sales (id, public_uuid, order_id, completed_at, currency_code, subtotal_cents, tax_total_cents, discount_total_cents, total_cents, paid_cents, pending_cents, status, table_id, opened_at, closed_at, closed_by_user_id, customer_id) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9, $10, $11, $12, $13, $14, $15, $16)", [fixedSale.id, fixedSale.publicUuid, fixedSale.orderId, fixedSale.completedAt, fixedSale.currencyCode, fixedSale.subtotalCents, fixedSale.taxTotalCents, fixedSale.totalCents, fixedSale.paidCents, fixedSale.pendingCents, fixedSale.status, fixedSale.tableId, fixedSale.openedAt, fixedSale.closedAt, fixedSale.closedByUserId, fixedSale.customerId]);
      for (const item of fixedSale.items) await client.query("INSERT INTO sale_items (id, sale_id, order_line_item_id, product_id, name, quantity, unit_price_cents, subtotal_cents, tax_cents, discount_cents, total_cents, account_id, customer_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)", [item.id, fixedSale.id, item.orderLineItemId ?? null, item.productId, item.name, item.quantity, item.unitPriceCents, item.subtotalCents, item.taxCents, item.discountCents, item.totalCents, item.accountId ?? null, item.customerId ?? null]);
      for (const settlement of fixedSale.settlements) await client.query("INSERT INTO sale_settlements (id, sale_id, method_code, amount_cents, tendered_cents, change_cents, settled_at, account_id, customer_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)", [settlement.id, fixedSale.id, settlement.methodCode, settlement.amountCents, settlement.tenderedCents, settlement.changeCents, settlement.settledAt, settlement.accountId ?? null, settlement.customerId ?? null]);
      await client.query("UPDATE orders SET status = $1, closed_at = $2, version = version + 1 WHERE id = $3", [closure.order.status, closedAt, orderId]);
      await client.query("UPDATE restaurant_tables SET status = 'free', current_order_id = NULL, version = version + 1 WHERE id = $1", [row.table_id]);
      await client.query("COMMIT");
      return fixedSale;
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }

  private async loadSale(executor: Pool, row: SaleRow): Promise<Sale> {
    const [items, settlements] = await Promise.all([
      executor.query<SaleItemRow>("SELECT id, sale_id, order_line_item_id, product_id, name, quantity::float8 AS quantity, unit_price_cents, subtotal_cents, tax_cents, discount_cents, total_cents, account_id, customer_id FROM sale_items WHERE sale_id = $1 ORDER BY id", [row.id]),
      executor.query<SaleSettlementRow>("SELECT id, sale_id, method_code, amount_cents, tendered_cents, change_cents, settled_at, account_id, customer_id FROM sale_settlements WHERE sale_id = $1 ORDER BY settled_at, id", [row.id]),
    ]);
    return { id: row.id, publicUuid: row.public_uuid, orderId: row.order_id, completedAt: iso(row.completed_at), currencyCode: row.currency_code, subtotalCents: row.subtotal_cents, taxTotalCents: row.tax_total_cents, discountTotalCents: row.discount_total_cents, totalCents: row.total_cents, paidCents: row.paid_cents, pendingCents: row.pending_cents, status: row.status, tableId: row.table_id, openedAt: row.opened_at ? iso(row.opened_at) : null, closedAt: iso(row.closed_at!), closedByUserId: row.closed_by_user_id, customerId: row.customer_id, items: items.rows.map((item) => ({ id: item.id, saleId: item.sale_id, orderLineItemId: item.order_line_item_id ?? undefined, productId: item.product_id, name: item.name, quantity: item.quantity, unitPriceCents: item.unit_price_cents, subtotalCents: item.subtotal_cents, taxCents: item.tax_cents, discountCents: item.discount_cents, totalCents: item.total_cents, ...(item.account_id ? { accountId: item.account_id } : {}), ...(item.customer_id ? { customerId: item.customer_id } : {}) })), settlements: settlements.rows.map((item) => ({ id: item.id, saleId: item.sale_id, methodCode: item.method_code, amountCents: item.amount_cents, tenderedCents: item.tendered_cents, changeCents: item.change_cents, settledAt: iso(item.settled_at), ...(item.account_id ? { accountId: item.account_id } : {}), ...(item.customer_id ? { customerId: item.customer_id } : {}) })) };
  }
}
