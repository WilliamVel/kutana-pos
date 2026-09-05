import type { Allocation } from "@kutana/shared/billing/model/allocation.js";
import type { Ticket } from "@kutana/shared/billing/model/ticket.js";
import type { TicketRepository } from "@kutana/shared/billing/ports/ticket-repository.js";
import { encodePathSegment, HttpClient, type HttpClientOptions } from "./http-client.js";

export class HttpTicketRepository implements TicketRepository {
  private readonly http: HttpClient;

  constructor(options: HttpClientOptions = {}) {
    this.http = new HttpClient(options);
  }

  findById(id: string): Promise<Ticket | null> {
    return this.http.request<Ticket | null>(`/billing/tickets/${encodePathSegment(id)}`);
  }

  listByOrder(orderId: string): Promise<Ticket[]> {
    return this.http.request<Ticket[]>(`/billing/orders/${encodePathSegment(orderId)}/tickets`);
  }

  listAllocationsByOrder(orderId: string): Promise<Allocation[]> {
    return this.http.request<Allocation[]>(`/billing/orders/${encodePathSegment(orderId)}/allocations`);
  }

  save(ticket: Ticket, allocations: Allocation[], expectedVersion: number): Promise<Ticket> {
    return this.http.request<Ticket>(`/billing/tickets/${encodePathSegment(ticket.id)}`, {
      method: "PUT",
      body: { ticket, allocations, expectedVersion },
    });
  }
}
