import { describe, expect, it, vi } from "vitest";
import type { Order } from "@kutana/shared/ordering/model/order.js";
import { buildHttpPorts } from "./http.js";

const BASE_URL = "http://api.example.test";

interface FetchCall {
  readonly url: string;
  readonly init: RequestInit;
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function createFetch(): { readonly fetchImpl: typeof fetch; readonly calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return jsonResponse([]);
  }) as unknown as typeof fetch;

  return { fetchImpl, calls };
}

class FakeEventSource {
  static instances: FakeEventSource[] = [];

  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  readonly close = vi.fn();

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  emit(event: unknown): void {
    this.onmessage?.({ data: JSON.stringify(event) } as MessageEvent<string>);
  }
}

describe("buildHttpPorts", () => {
  it("returns a complete Ports object backed by the supplied HTTP client options", async () => {
    const { fetchImpl, calls } = createFetch();
    const ports = buildHttpPorts({ baseUrl: BASE_URL, fetchImpl });

    expect(Object.keys(ports).sort()).toEqual([
      "analytics",
          "auth",
      "categories",
      "customerDebts",
      "customers",
      "events",
      "orders",
      "paymentClosure",
      "paymentMethods",
      "payments",
      "personalAccounts",
      "products",
      "stock",
      "tables",
      "tickets",
      "userManagement",
    ]);

    await ports.customers.listAll();
    await ports.orders.listAll();

    expect(calls.map((call) => call.url)).toEqual([
      `${BASE_URL}/billing/customers`,
      `${BASE_URL}/ordering/orders`,
    ]);
  });

  it("uses database-backed payment methods and SSE-backed same-tab order events", async () => {
    FakeEventSource.instances = [];
    const { fetchImpl } = createFetch();
    const ports = buildHttpPorts({
      baseUrl: BASE_URL,
      fetchImpl,
      EventSourceImpl: FakeEventSource,
    });
    const listener = vi.fn();
    const order = { id: "order-1", tableId: "table-1", version: 1 } as Order;

    await expect(ports.paymentMethods.listAll()).resolves.toEqual([]);
    expect(fetchImpl).toHaveBeenCalledWith(`${BASE_URL}/payments/methods`, expect.anything());

    const unsubscribe = ports.events.subscribe("order-1", listener);
    ports.events.publish({
      type: "order.updated",
      orderId: "order-1",
      tableId: "table-1",
      version: 1,
      at: "2025-01-01T00:00:00.000Z",
      payload: order,
    });

    expect(listener).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(FakeEventSource.instances.map((source) => source.url)).toEqual([
      `${BASE_URL}/ordering/orders/order-1/events`,
    ]);

    unsubscribe();
  });
});
