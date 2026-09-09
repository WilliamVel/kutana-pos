import type { AuthService } from "@kutana/shared/auth/ports/auth-service.js";
import type { OrderRepository } from "@kutana/shared/ordering/ports/order-repository.js";
import type { OrderEvents } from "@kutana/shared/ordering/ports/order-events.js";
import type { TableRepository } from "@kutana/shared/ordering/ports/table-repository.js";
import type { CustomerDebtRepository } from "@kutana/shared/billing/ports/customer-debt-repository.js";
import type { CustomerRepository } from "@kutana/shared/billing/ports/customer-repository.js";
import type { PersonalAccountRepository } from "@kutana/shared/billing/ports/personal-account-repository.js";
import type { TicketRepository } from "@kutana/shared/billing/ports/ticket-repository.js";
import type { PaymentRepository } from "@kutana/shared/payments/ports/payment-repository.js";
import type { PaymentMethodRepository } from "@kutana/shared/payments/ports/payment-method-repository.js";
import type { ProductRepository } from "@kutana/shared/catalog/ports/product-repository.js";
import type { CategoryRepository } from "@kutana/shared/catalog/ports/category-repository.js";
import type { StockRepository } from "@kutana/shared/inventory/ports/stock-repository.js";

/**
 * The composition root's single dependency bag. Every port a feature needs
 * lives here, and here alone. Components never import a concrete adapter —
 * they consume this shape through `PortsProvider` + the typed hooks in
 * `PortsProvider.tsx`. Swapping mock adapters for HTTP adapters at
 * milestone 2 means implementing `buildHttpPorts(): Ports` and changing the
 * ONE line in `main.tsx` that selects which builder runs — no component,
 * container, or hook changes.
 *
 * Payment methods are data served through a repository so runtime screens
 * read them from the backend/database just like catalog categories.
 */
export interface Ports {
  readonly auth?: AuthService;
  readonly orders: OrderRepository;
  readonly tables: TableRepository;
  /**
   * @deprecated Legacy milestone-1 payment compatibility only. New payable flows use
   * `personalAccounts`, `customerDebts`, and explicit payment targets.
   */
  readonly tickets: TicketRepository;
  readonly customers: CustomerRepository;
  readonly personalAccounts: PersonalAccountRepository;
  readonly customerDebts: CustomerDebtRepository;
  readonly payments: PaymentRepository;
  readonly paymentMethods: PaymentMethodRepository;
  readonly products: ProductRepository;
  readonly categories: CategoryRepository;
  readonly stock: StockRepository;
  readonly events: OrderEvents;
}
