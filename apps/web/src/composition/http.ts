import { KUTANA_V1_PAYMENT_METHODS } from "@kutana/shared/payments/model/payment-method-registry.seed.js";
import { HttpAuthService } from "../adapters/http/auth-service.js";
import { HttpCategoryRepository } from "../adapters/http/category-repository.js";
import { HttpCustomerDebtRepository } from "../adapters/http/customer-debt-repository.js";
import { HttpCustomerRepository } from "../adapters/http/customer-repository.js";
import type { HttpClientOptions } from "../adapters/http/http-client.js";
import { HttpOrderEvents, type HttpOrderEventsOptions } from "../adapters/http/order-events.js";
import { HttpOrderRepository } from "../adapters/http/order-repository.js";
import { HttpPaymentRepository } from "../adapters/http/payment-repository.js";
import { HttpPersonalAccountRepository } from "../adapters/http/personal-account-repository.js";
import { HttpProductRepository } from "../adapters/http/product-repository.js";
import { HttpStockRepository } from "../adapters/http/stock-repository.js";
import { HttpTableRepository } from "../adapters/http/table-repository.js";
import { HttpTicketRepository } from "../adapters/http/ticket-repository.js";
import type { Ports } from "./ports.js";

/**
 * HTTP wiring: repository ports are backed by fetch-based HTTP adapters and
 * order events use SSE plus same-tab fanout after successful local saves.
 */
export type HttpPortsOptions = HttpClientOptions & HttpOrderEventsOptions;

export function buildHttpPorts(options: HttpPortsOptions = {}): Ports {
  const auth = new HttpAuthService(options);
  const authenticatedOptions: HttpPortsOptions = {
    ...options,
    getBearerToken: () => auth.currentSession()?.token ?? options.getBearerToken?.() ?? null,
  };

  return {
    auth,
    orders: new HttpOrderRepository(authenticatedOptions),
    tables: new HttpTableRepository(authenticatedOptions),
    tickets: new HttpTicketRepository(authenticatedOptions),
    customers: new HttpCustomerRepository(authenticatedOptions),
    personalAccounts: new HttpPersonalAccountRepository(authenticatedOptions),
    customerDebts: new HttpCustomerDebtRepository(authenticatedOptions),
    payments: new HttpPaymentRepository(authenticatedOptions),
    products: new HttpProductRepository(authenticatedOptions),
    categories: new HttpCategoryRepository(authenticatedOptions),
    stock: new HttpStockRepository(authenticatedOptions),
    methods: KUTANA_V1_PAYMENT_METHODS,
    events: new HttpOrderEvents(authenticatedOptions),
  };
}
