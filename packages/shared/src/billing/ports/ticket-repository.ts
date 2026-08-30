import type { Allocation } from "../model/allocation.js";
import type { Ticket } from "../model/ticket.js";

/** Port contract only — implementations live in adapters (mock/HTTP/Postgres). */
export interface TicketRepository {
  findById(id: string): Promise<Ticket | null>;
  listByOrder(orderId: string): Promise<Ticket[]>;
  listAllocationsByOrder(orderId: string): Promise<Allocation[]>;
  /** Persists a Ticket and its Allocation set together. Throws ConflictError<Ticket> on stale version. */
  save(ticket: Ticket, allocations: Allocation[], expectedVersion: number): Promise<Ticket>;
}
