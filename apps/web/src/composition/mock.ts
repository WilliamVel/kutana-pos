import { MockAnalyticsService } from "../adapters/mock/analytics-service.js";
import { MockAuthService } from "../adapters/mock/auth-service.js";
import { MockCategoryRepository } from "../adapters/mock/category-repository.js";
import { MockCustomerDebtRepository } from "../adapters/mock/customer-debt-repository.js";
import { MockCustomerRepository } from "../adapters/mock/customer-repository.js";
import { MockOrderEvents } from "../adapters/mock/order-events.js";
import { MockOrderRepository } from "../adapters/mock/order-repository.js";
import { MockPaymentMethodRepository } from "../adapters/mock/payment-method-repository.js";
import { MockPaymentClosureService } from "../adapters/mock/payment-closure-service.js";
import { MockPaymentRepository } from "../adapters/mock/payment-repository.js";
import { MockPersonalAccountRepository } from "../adapters/mock/personal-account-repository.js";
import { MockProductRepository } from "../adapters/mock/product-repository.js";
import { MockStockRepository } from "../adapters/mock/stock-repository.js";
import { MockTableRepository } from "../adapters/mock/table-repository.js";
import { MockTicketRepository } from "../adapters/mock/ticket-repository.js";
import { MockUserManagementService } from "../adapters/mock/user-management-service.js";
import { buildSeedFixtures } from "../adapters/mock/seed-fixtures.js";
import type { Ports } from "./ports.js";

/**
 * Milestone-1 wiring: builds a fresh `Ports` bag backed entirely by the
 * in-memory mock adapters from `apps/web/src/adapters/mock/`, pre-loaded
 * with catalog category plus ordering/table demo fixtures. This is the ONLY
 * function `main.tsx` needs to call today; `buildHttpPorts()` (milestone 2)
 * has the identical `(): Ports` signature.
 *
 * Every call returns brand-new adapter instances — callers must not share
 * a single `Ports` object across independent tests or independent demo
 * sessions expecting isolated state.
 */
export function buildMockPorts(): Ports {
  const fixtures = buildSeedFixtures();

  const auth = new MockAuthService();
  const userManagement = new MockUserManagementService(undefined, (userId, newPin) => auth.resetPin(userId, newPin));
  const orders = new MockOrderRepository();
  const tables = new MockTableRepository();
  const tickets = new MockTicketRepository();
  const customers = new MockCustomerRepository();
  const personalAccounts = new MockPersonalAccountRepository();
  const customerDebts = new MockCustomerDebtRepository();
  const payments = new MockPaymentRepository();
  const paymentMethods = new MockPaymentMethodRepository();
  const products = new MockProductRepository();
  const categories = new MockCategoryRepository();
  const stock = new MockStockRepository();
  const events = new MockOrderEvents();
    const paymentClosure = new MockPaymentClosureService(orders, tables);

  seedCategories(categories, fixtures);
  seedOrders(orders, fixtures);
  seedTables(tables, fixtures);

  return {
    analytics: new MockAnalyticsService(),
    auth,
    userManagement,
    orders,
    tables,
    tickets,
    customers,
    personalAccounts,
    customerDebts,
    payments,
    paymentClosure,
    products,
    categories,
    stock,
    paymentMethods,
    events,
  };
}

function seedCategories(
  repository: MockCategoryRepository,
  fixtures: ReturnType<typeof buildSeedFixtures>,
): void {
  for (const category of fixtures.categories) {
    void repository.save(category);
  }
}

function seedTables(
  repository: MockTableRepository,
  fixtures: ReturnType<typeof buildSeedFixtures>,
): void {
  for (const table of fixtures.tables) {
    void repository.save(table, 0);
  }
}

function seedOrders(
  repository: MockOrderRepository,
  fixtures: ReturnType<typeof buildSeedFixtures>,
): void {
  for (const order of fixtures.openOrders) {
    void repository.save(order, 0);
  }
}
