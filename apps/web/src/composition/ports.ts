import type { OrderRepository } from "@kutana/shared/ordering/ports/order-repository.js";
import type { OrderEvents } from "@kutana/shared/ordering/ports/order-events.js";
import type { TableRepository } from "@kutana/shared/ordering/ports/table-repository.js";
import type { TicketRepository } from "@kutana/shared/billing/ports/ticket-repository.js";
import type { PaymentRepository } from "@kutana/shared/payments/ports/payment-repository.js";
import type { PaymentMethodRegistry } from "@kutana/shared/payments/model/payment-method-registry.js";
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
 * `methods` is the payment-method registry data (see
 * `payments/model/payment-method-registry.ts` — a registry, never a
 * hardcoded domain enum), not a repository; it has no adapter variant to
 * swap because it is the same seed data at both milestones until a backend
 * owns it.
 */
export interface Ports {
  readonly orders: OrderRepository;
  readonly tables: TableRepository;
  readonly tickets: TicketRepository;
  readonly payments: PaymentRepository;
  readonly products: ProductRepository;
  readonly categories: CategoryRepository;
  readonly stock: StockRepository;
  readonly methods: PaymentMethodRegistry;
  readonly events: OrderEvents;
}
