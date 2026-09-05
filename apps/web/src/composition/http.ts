import { KUTANA_V1_PAYMENT_METHODS } from "@kutana/shared/payments/model/payment-method-registry.seed.js";
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
  return {
    orders: new HttpOrderRepository(options),
    tables: new HttpTableRepository(options),
    tickets: new HttpTicketRepository(options),
    customers: new HttpCustomerRepository(options),
    personalAccounts: new HttpPersonalAccountRepository(options),
    customerDebts: new HttpCustomerDebtRepository(options),
    payments: new HttpPaymentRepository(options),
    products: new HttpProductRepository(options),
    categories: new HttpCategoryRepository(options),
    stock: new HttpStockRepository(options),
    methods: KUTANA_V1_PAYMENT_METHODS,
    events: new HttpOrderEvents(options),
  };
}
