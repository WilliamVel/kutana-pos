import type { Order } from "@kutana/shared/ordering/model/order.js";
import type { OrderRepository } from "@kutana/shared/ordering/ports/order-repository.js";
import { encodePathSegment, HttpClient, type HttpClientOptions } from "./http-client.js";

export class HttpOrderRepository implements OrderRepository {
  private readonly http: HttpClient;

  constructor(options: HttpClientOptions = {}) {
    this.http = new HttpClient(options);
  }

  findByTable(tableId: string): Promise<Order | null> {
    return this.http.request<Order | null>("/ordering/orders", {
      query: { tableId },
    });
  }

  listAll(): Promise<Order[]> {
    return this.http.request<Order[]>("/ordering/orders");
  }

  save(order: Order, expectedVersion: number): Promise<Order> {
    return this.http.request<Order>(`/ordering/orders/${encodePathSegment(order.id)}`, {
      method: "PUT",
      body: { order, expectedVersion },
    });
  }
}
