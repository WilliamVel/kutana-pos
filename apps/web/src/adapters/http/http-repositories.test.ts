import { describe, expect, it, vi } from "vitest";
import type { Allocation } from "@kutana/shared/billing/model/allocation.js";
import type { CustomerDebtEntry } from "@kutana/shared/billing/model/customer-debt-ledger.js";
import type { Category } from "@kutana/shared/catalog/model/category.js";
import type { Product } from "@kutana/shared/catalog/model/product.js";
import type { Customer, PersonalAccount } from "@kutana/shared/billing/model/personal-account.js";
import type { Ticket } from "@kutana/shared/billing/model/ticket.js";
import type { PaymentMethodCode } from "@kutana/shared/payments/model/payment-method-registry.js";
import type { Payment } from "@kutana/shared/payments/model/payment.js";
import type { StockItem } from "@kutana/shared/inventory/model/stock-item.js";
import type { StockMovement } from "@kutana/shared/inventory/model/stock-movement.js";
import type { Order } from "@kutana/shared/ordering/model/order.js";
import type { Table } from "@kutana/shared/ordering/model/table.js";
import { HttpCategoryRepository } from "./category-repository.js";
import { HttpCustomerDebtRepository } from "./customer-debt-repository.js";
import { HttpCustomerRepository } from "./customer-repository.js";
import { HttpClient, HttpError } from "./http-client.js";
import { HttpOrderRepository } from "./order-repository.js";
import { HttpPaymentRepository } from "./payment-repository.js";
import { HttpPersonalAccountRepository } from "./personal-account-repository.js";
import { HttpProductRepository } from "./product-repository.js";
import { HttpStockRepository } from "./stock-repository.js";
import { HttpTableRepository } from "./table-repository.js";
import { HttpTicketRepository } from "./ticket-repository.js";

const BASE_URL = "http://api.example.test/root";

interface FetchCall {
  readonly url: string;
  readonly init: RequestInit;
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function createFetch(responses: readonly Response[] = [jsonResponse({ ok: true })]): {
  readonly fetchImpl: typeof fetch;
  readonly calls: FetchCall[];
} {
  const calls: FetchCall[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    const response = responses[calls.length - 1] ?? responses[responses.length - 1];
    if (!response) throw new Error("No mocked response configured");
    return response;
  }) as unknown as typeof fetch;

  return { fetchImpl, calls };
}

function parseJsonBody(call: FetchCall): unknown {
  return JSON.parse(String(call.init.body));
}

const customer: Customer = {
  id: "customer 1/with slash",
  displayName: "Ana",
  phone: null,
  email: null,
  notes: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

const ticket: Ticket = {
  id: "ticket-1",
  orderId: "order-1",
  label: "Mesa",
  status: "open",
  version: 3,
};

const allocation: Allocation = {
  id: "allocation-1",
  lineItemId: "line-1",
  ticketId: "ticket-1",
  shareBp: 10_000,
};

const account: PersonalAccount = {
  id: "account-1",
  orderId: "order-1",
  owner: { kind: "free_name", freeName: "Mesa" },
  status: "open",
  createdAt: "2025-01-01T00:00:00.000Z",
  closedAt: null,
  version: 2,
};

const debtEntry: CustomerDebtEntry = {
  id: "debt-1",
  customerId: "customer 1",
  kind: "pending_account",
  direction: "debit",
  amountCents: 1200,
  accountId: "account-1",
  paymentId: null,
  note: null,
  createdAt: "2025-01-01T00:00:00.000Z",
};

const payment: Payment = {
  id: "payment-1",
  target: { kind: "personal_account", accountId: "account-1" },
  methodCode: "FIXTURE_METHOD" as PaymentMethodCode,
  amountCents: 1200,
  tenderedCents: 1200,
  changeCents: 0,
  recordedAt: "2025-01-01T00:00:00.000Z",
};

const table: Table = {
  id: "table 1/with slash",
  label: "Mesa 1",
  status: "active",
  currentOrderId: "order 1/with slash",
  version: 2,
};

const order: Order = {
  id: "order 1/with slash",
  tableId: "table 1/with slash",
  status: "active",
  lineItems: [],
  openedAt: "2025-01-01T00:00:00.000Z",
  closedAt: null,
  customerId: null,
  version: 3,
};

const category: Category = {
  id: "category 1/with slash",
  name: "Bebidas",
  sortOrder: 1,
};

const product: Product = {
  id: "product 1/with slash",
  sku: "sku 1/with slash",
  barcode: "barcode 1/with slash",
  name: "Agua",
  categoryId: "category 1/with slash",
  priceCents: 1200,
  costPriceCents: 600,
  taxRateBp: 1900,
  description: null,
  imageUrl: null,
  lowStockLevel: 5,
  stockKind: "unit",
  pourSizeMl: null,
  stockItemId: "stock 1/with slash",
  active: true,
  version: 2,
};

const stockItem: StockItem = {
  id: "stock 1/with slash",
  name: "Agua stock",
  kind: "unit",
  unit: "ea",
  quantity: 4,
  lowStockLevel: 5,
  version: 3,
};

const movement: StockMovement = {
  id: "movement-1",
  stockItemId: "stock 1/with slash",
  delta: -1,
  reason: "sale",
  refType: "order",
  refId: "order-1",
  occurredAt: "2025-01-01T00:00:00.000Z",
};

describe("HTTP repositories", () => {
  it("composes baseUrl and URL-encodes path segments", async () => {
    const { fetchImpl, calls } = createFetch([jsonResponse(customer)]);
    const repository = new HttpCustomerRepository({ baseUrl: `${BASE_URL}/`, fetchImpl });

    await repository.findById("customer 1/with slash");

    expect(calls[0]?.url).toBe(
      "http://api.example.test/root/billing/customers/customer%201%2Fwith%20slash",
    );
    expect(calls[0]?.init.method).toBe("GET");
  });

  it("passes through JSON null for findById", async () => {
    const { fetchImpl } = createFetch([jsonResponse(null)]);
    const repository = new HttpCustomerRepository({ baseUrl: BASE_URL, fetchImpl });

    await expect(repository.findById("missing-customer")).resolves.toBeNull();
  });

  it("rejects non-2xx responses with status and message", async () => {
    const { fetchImpl } = createFetch([
      new Response("Version conflict", { status: 409, statusText: "Conflict" }),
    ]);
    const client = new HttpClient({ baseUrl: BASE_URL, fetchImpl });

    await expect(client.request("/billing/tickets/ticket-1")).rejects.toMatchObject({
      name: "HttpError",
      status: 409,
      message: expect.stringContaining("Version conflict"),
    } satisfies Partial<HttpError>);
  });

  it("maps CustomerRepository listAll, search, and save", async () => {
    const { fetchImpl, calls } = createFetch([
      jsonResponse([customer]),
      jsonResponse([customer]),
      jsonResponse(customer),
    ]);
    const repository = new HttpCustomerRepository({ baseUrl: BASE_URL, fetchImpl });

    await repository.listAll();
    await repository.search("Ana María");
    await repository.save(customer);

    expect(calls[0]?.url).toBe(`${BASE_URL}/billing/customers`);
    expect(calls[0]?.init.method).toBe("GET");
    expect(calls[1]?.url).toBe(`${BASE_URL}/billing/customers?q=Ana+Mar%C3%ADa`);
    expect(calls[1]?.init.method).toBe("GET");
    expect(calls[2]?.url).toBe(`${BASE_URL}/billing/customers/customer%201%2Fwith%20slash`);
    expect(calls[2]?.init.method).toBe("PUT");
    expect(parseJsonBody(calls[2]!)).toEqual(customer);
  });

  it("maps TicketRepository save body shape", async () => {
    const { fetchImpl, calls } = createFetch([jsonResponse(ticket)]);
    const repository = new HttpTicketRepository({ baseUrl: BASE_URL, fetchImpl });

    await repository.save(ticket, [allocation], 3);

    expect(calls[0]?.url).toBe(`${BASE_URL}/billing/tickets/ticket-1`);
    expect(calls[0]?.init.method).toBe("PUT");
    expect(parseJsonBody(calls[0]!)).toEqual({
      ticket,
      allocations: [allocation],
      expectedVersion: 3,
    });
  });

  it("maps PersonalAccountRepository listByOrder query and delete expectedVersion query", async () => {
    const { fetchImpl, calls } = createFetch([
      jsonResponse([account]),
      new Response(null, { status: 204 }),
    ]);
    const repository = new HttpPersonalAccountRepository({ baseUrl: BASE_URL, fetchImpl });

    await repository.listByOrder("order 1/with slash");
    await repository.delete("account 1/with slash", 7);

    expect(calls[0]?.url).toBe(
      `${BASE_URL}/billing/personal-accounts?orderId=order+1%2Fwith+slash`,
    );
    expect(calls[0]?.init.method).toBe("GET");
    expect(calls[1]?.url).toBe(
      `${BASE_URL}/billing/personal-accounts/account%201%2Fwith%20slash?expectedVersion=7`,
    );
    expect(calls[1]?.init.method).toBe("DELETE");
  });

  it("maps CustomerDebtRepository record and listByCustomer", async () => {
    const { fetchImpl, calls } = createFetch([jsonResponse(debtEntry), jsonResponse([debtEntry])]);
    const repository = new HttpCustomerDebtRepository({ baseUrl: BASE_URL, fetchImpl });

    await repository.record(debtEntry);
    await repository.listByCustomer("customer 1");

    expect(calls[0]?.url).toBe(`${BASE_URL}/billing/customer-debts`);
    expect(calls[0]?.init.method).toBe("POST");
    expect(parseJsonBody(calls[0]!)).toEqual(debtEntry);
    expect(calls[1]?.url).toBe(`${BASE_URL}/billing/customers/customer%201/debts`);
    expect(calls[1]?.init.method).toBe("GET");
  });

  it("maps PaymentRepository listByTarget for all target kinds and record", async () => {
    const { fetchImpl, calls } = createFetch([
      jsonResponse([]),
      jsonResponse([]),
      jsonResponse([]),
      jsonResponse(payment),
    ]);
    const repository = new HttpPaymentRepository({ baseUrl: BASE_URL, fetchImpl });

    await repository.listByTarget({ kind: "personal_account", accountId: "account 1" });
    await repository.listByTarget({ kind: "customer_debt", customerId: "customer 1" });
    await repository.listByTarget({ kind: "ticket", ticketId: "ticket 1" });
    await repository.record(payment);

    expect(calls[0]?.url).toBe(
      `${BASE_URL}/payments?targetKind=personal_account&accountId=account+1`,
    );
    expect(calls[1]?.url).toBe(
      `${BASE_URL}/payments?targetKind=customer_debt&customerId=customer+1`,
    );
    expect(calls[2]?.url).toBe(`${BASE_URL}/payments?targetKind=ticket&ticketId=ticket+1`);
    expect(calls[3]?.url).toBe(`${BASE_URL}/payments`);
    expect(calls[3]?.init.method).toBe("POST");
    expect(parseJsonBody(calls[3]!)).toEqual(payment);
  });

  it("maps OrderRepository findByTable, listAll, and save", async () => {
    const { fetchImpl, calls } = createFetch([
      jsonResponse(order),
      jsonResponse([order]),
      jsonResponse(order),
    ]);
    const repository = new HttpOrderRepository({ baseUrl: BASE_URL, fetchImpl });

    await repository.findByTable("table 1/with slash");
    await repository.listAll();
    await repository.save(order, 3);

    expect(calls[0]?.url).toBe(`${BASE_URL}/ordering/orders?tableId=table+1%2Fwith+slash`);
    expect(calls[0]?.init.method).toBe("GET");
    expect(calls[1]?.url).toBe(`${BASE_URL}/ordering/orders`);
    expect(calls[1]?.init.method).toBe("GET");
    expect(calls[2]?.url).toBe(`${BASE_URL}/ordering/orders/order%201%2Fwith%20slash`);
    expect(calls[2]?.init.method).toBe("PUT");
    expect(parseJsonBody(calls[2]!)).toEqual({ order, expectedVersion: 3 });
  });

  it("maps TableRepository listAll, findById, and save", async () => {
    const { fetchImpl, calls } = createFetch([
      jsonResponse([table]),
      jsonResponse(table),
      jsonResponse(table),
    ]);
    const repository = new HttpTableRepository({ baseUrl: BASE_URL, fetchImpl });

    await repository.listAll();
    await repository.findById("table 1/with slash");
    await repository.save(table, 2);

    expect(calls[0]?.url).toBe(`${BASE_URL}/ordering/tables`);
    expect(calls[0]?.init.method).toBe("GET");
    expect(calls[1]?.url).toBe(`${BASE_URL}/ordering/tables/table%201%2Fwith%20slash`);
    expect(calls[1]?.init.method).toBe("GET");
    expect(calls[2]?.url).toBe(`${BASE_URL}/ordering/tables/table%201%2Fwith%20slash`);
    expect(calls[2]?.init.method).toBe("PUT");
    expect(parseJsonBody(calls[2]!)).toEqual({ table, expectedVersion: 2 });
  });

  it("maps CategoryRepository listAll, findById, and save", async () => {
    const { fetchImpl, calls } = createFetch([
      jsonResponse([category]),
      jsonResponse(category),
      jsonResponse(category),
    ]);
    const repository = new HttpCategoryRepository({ baseUrl: BASE_URL, fetchImpl });

    await repository.listAll();
    await repository.findById("category 1/with slash");
    await repository.save(category);

    expect(calls[0]?.url).toBe(`${BASE_URL}/catalog/categories`);
    expect(calls[0]?.init.method).toBe("GET");
    expect(calls[1]?.url).toBe(`${BASE_URL}/catalog/categories/category%201%2Fwith%20slash`);
    expect(calls[1]?.init.method).toBe("GET");
    expect(calls[2]?.url).toBe(`${BASE_URL}/catalog/categories/category%201%2Fwith%20slash`);
    expect(calls[2]?.init.method).toBe("PUT");
    expect(parseJsonBody(calls[2]!)).toEqual(category);
  });

  it("maps ProductRepository lookup, category query, and save", async () => {
    const { fetchImpl, calls } = createFetch([
      jsonResponse(product),
      jsonResponse(product),
      jsonResponse([product]),
      jsonResponse([product]),
      jsonResponse(product),
    ]);
    const repository = new HttpProductRepository({ baseUrl: BASE_URL, fetchImpl });

    await repository.findBySku("sku 1/with slash");
    await repository.findByBarcode("barcode 1/with slash");
    await repository.listByCategory("category 1/with slash", { includeInactive: true });
    await repository.listByCategory("category 1/with slash", { includeInactive: false });
    await repository.save(product, 2);

    expect(calls[0]?.url).toBe(`${BASE_URL}/catalog/products/by-sku/sku%201%2Fwith%20slash`);
    expect(calls[1]?.url).toBe(
      `${BASE_URL}/catalog/products/by-barcode/barcode%201%2Fwith%20slash`,
    );
    expect(calls[2]?.url).toBe(
      `${BASE_URL}/catalog/categories/category%201%2Fwith%20slash/products?includeInactive=true`,
    );
    expect(calls[3]?.url).toBe(
      `${BASE_URL}/catalog/categories/category%201%2Fwith%20slash/products`,
    );
    expect(calls[4]?.url).toBe(`${BASE_URL}/catalog/products/product%201%2Fwith%20slash`);
    expect(calls[4]?.init.method).toBe("PUT");
    expect(parseJsonBody(calls[4]!)).toEqual({ product, expectedVersion: 2 });
  });

  it("maps StockRepository low-stock, movement listing, and recordMovement", async () => {
    const { fetchImpl, calls } = createFetch([
      jsonResponse([stockItem]),
      jsonResponse([movement]),
      jsonResponse(stockItem),
    ]);
    const repository = new HttpStockRepository({ baseUrl: BASE_URL, fetchImpl });

    await repository.listLowStock();
    await repository.listMovements("stock 1/with slash");
    await repository.recordMovement(stockItem, movement, 3);

    expect(calls[0]?.url).toBe(`${BASE_URL}/inventory/stock-items/low-stock`);
    expect(calls[0]?.init.method).toBe("GET");
    expect(calls[1]?.url).toBe(
      `${BASE_URL}/inventory/stock-items/stock%201%2Fwith%20slash/movements`,
    );
    expect(calls[1]?.init.method).toBe("GET");
    expect(calls[2]?.url).toBe(`${BASE_URL}/inventory/stock-movements`);
    expect(calls[2]?.init.method).toBe("POST");
    expect(parseJsonBody(calls[2]!)).toEqual({ stockItem, movement, expectedVersion: 3 });
  });
});

describe("HttpClient auth", () => {
  it("attaches a bearer token from client options unless auth is disabled", async () => {
    const { fetchImpl, calls } = createFetch([
      jsonResponse({ ok: true }),
      jsonResponse({ ok: true }),
    ]);
    const client = new HttpClient({
      baseUrl: BASE_URL,
      fetchImpl,
      getBearerToken: () => "token-1",
    });

    await client.request("/protected");
    await client.request("/auth/login", { method: "POST", body: {}, auth: false });

    expect((calls[0]?.init.headers as Headers).get("Authorization")).toBe("Bearer token-1");
    expect((calls[1]?.init.headers as Headers).get("Authorization")).toBeNull();
  });

  it("refreshes once after a 401 and retries the protected request", async () => {
    const { fetchImpl, calls } = createFetch([
      new Response("Expired bearer token", { status: 401, statusText: "Unauthorized" }),
      jsonResponse({ ok: true }),
    ]);
    const client = new HttpClient({
      baseUrl: BASE_URL,
      fetchImpl,
      getBearerToken: () => "expired-token",
      refreshSession: async () => "fresh-token",
    });

    await expect(client.request("/protected")).resolves.toEqual({ ok: true });

    expect(calls).toHaveLength(2);
    expect((calls[0]?.init.headers as Headers).get("Authorization")).toBe("Bearer fresh-token");
    expect((calls[1]?.init.headers as Headers).get("Authorization")).toBe("Bearer fresh-token");
  });
});
