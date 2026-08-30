import { createStockMovement } from "@kutana/shared/inventory/model/stock-movement.js";
import { KUTANA_V1_PAYMENT_METHODS } from "@kutana/shared/payments/model/payment-method-registry.seed.js";
import { MockOrderEvents } from "../adapters/mock/order-events.js";
import { MockOrderRepository } from "../adapters/mock/order-repository.js";
import { MockPaymentRepository } from "../adapters/mock/payment-repository.js";
import { MockProductRepository } from "../adapters/mock/product-repository.js";
import { MockStockRepository } from "../adapters/mock/stock-repository.js";
import { MockTicketRepository } from "../adapters/mock/ticket-repository.js";
import { buildSeedFixtures } from "../adapters/mock/seed-fixtures.js";
import type { Ports } from "./ports.js";

/**
 * Milestone-1 wiring: builds a fresh `Ports` bag backed entirely by the
 * in-memory mock adapters from `apps/web/src/adapters/mock/`, pre-loaded
 * with the demo seed fixtures. This is the ONLY function `main.tsx` needs
 * to call today; `buildHttpPorts()` (milestone 2) will have the identical
 * `(): Ports` signature.
 *
 * Every call returns brand-new adapter instances — callers must not share
 * a single `Ports` object across independent tests or independent demo
 * sessions expecting isolated state.
 */
export function buildMockPorts(): Ports {
  const fixtures = buildSeedFixtures();

  const orders = new MockOrderRepository();
  const tickets = new MockTicketRepository();
  const payments = new MockPaymentRepository();
  const products = new MockProductRepository();
  const stock = new MockStockRepository();
  const events = new MockOrderEvents();

  seedProducts(products, fixtures.products);
  seedStock(stock, fixtures.stockItems);
  seedOrder(orders, fixtures);

  return {
    orders,
    tickets,
    payments,
    products,
    stock,
    methods: KUTANA_V1_PAYMENT_METHODS,
    events,
  };
}

function seedProducts(
  repository: MockProductRepository,
  products: ReturnType<typeof buildSeedFixtures>["products"],
): void {
  for (const product of products) {
    // Fixtures are already valid `Product` aggregates at version 1; saving
    // with expectedVersion 0 is the mock adapter's "insert" path (no stored
    // row yet to conflict with).
    void repository.save(product, 0);
  }
}

function seedStock(
  repository: MockStockRepository,
  stockItems: ReturnType<typeof buildSeedFixtures>["stockItems"],
): void {
  for (const item of stockItems) {
    const seedMovement = createStockMovement({
      stockItemId: item.id,
      delta: 0,
      reason: "adjustment",
      refType: "seed",
      refId: item.id,
      occurredAt: new Date(0).toISOString(),
    });
    void repository.recordMovement(item, seedMovement, 0);
  }
}

function seedOrder(
  repository: MockOrderRepository,
  fixtures: ReturnType<typeof buildSeedFixtures>,
): void {
  void repository.save(fixtures.openOrder, 0);
}
