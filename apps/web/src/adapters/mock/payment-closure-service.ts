import { createSale } from "@kutana/shared/billing/model/sale.js";
import type { PaymentClosureService } from "@kutana/shared/billing/ports/payment-closure-service.js";
import type { OrderRepository } from "@kutana/shared/ordering/ports/order-repository.js";
import type { TableRepository } from "@kutana/shared/ordering/ports/table-repository.js";

/** In-memory stand-in for the backend's atomic closure operation. */
export class MockPaymentClosureService implements PaymentClosureService {
  private readonly salesByOrderId = new Map<string, ReturnType<typeof createSale>>();

  constructor(
    private readonly orders: OrderRepository,
    private readonly tables: TableRepository,
  ) {}

  async closeOrder(orderId: string) {
    const existing = this.salesByOrderId.get(orderId);
    if (existing) return existing;

    const order = (await this.orders.listAll()).find((candidate) => candidate.id === orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);

    const closedAt = new Date().toISOString();
    const totalCents = order.lineItems.reduce((sum, line) => sum + line.totalCents, 0);
    const taxTotalCents = order.lineItems.reduce((sum, line) => sum + line.taxCents, 0);
    const sale = createSale({
      orderId,
      totalCents,
      taxTotalCents,
      subtotalCents: totalCents - taxTotalCents,
      closedAt,
      tableId: order.tableId,
      items: order.lineItems.map((line) => ({
        id: `${line.id}-sale-item`,
        saleId: "",
        orderLineItemId: line.id,
        productId: line.productId,
        name: line.nameSnapshot,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        subtotalCents: line.totalCents - line.taxCents,
        taxCents: line.taxCents,
        discountCents: 0,
        totalCents: line.totalCents,
      })),
    });
    const fixedSale = {
      ...sale,
      items: sale.items.map((item) => ({ ...item, saleId: sale.id })),
    };

    await this.orders.save({ ...order, status: "paid", closedAt }, order.version);
    const table = await this.tables.findById(order.tableId);
    if (table) await this.tables.save({ ...table, status: "free", currentOrderId: null }, table.version);
    this.salesByOrderId.set(orderId, fixedSale);
    return fixedSale;
  }
}
