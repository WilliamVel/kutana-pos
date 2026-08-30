import type { Allocation } from "@kutana/shared/billing/model/allocation.js";
import type { Ticket } from "@kutana/shared/billing/model/ticket.js";
import type { TicketRepository } from "@kutana/shared/billing/ports/ticket-repository.js";
import { ConflictError } from "@kutana/shared/errors/conflict-error.js";
import { ConflictTrigger } from "./conflict-trigger.js";
import { simulateLatency } from "./simulate-latency.js";

/**
 * In-memory `TicketRepository` for milestone 1. Allocations are stored
 * globally, keyed by `lineItemId` (mirrors the v1 invariant: exactly one
 * allocation per line item), so repointing an allocation to a different
 * ticket (a bill split) is a plain upsert.
 */
export class MockTicketRepository implements TicketRepository {
  private readonly ticketsById = new Map<string, Ticket>();
  private readonly allocationsByLineItem = new Map<string, Allocation>();
  readonly conflictTrigger = new ConflictTrigger();

  async findById(id: string): Promise<Ticket | null> {
    return simulateLatency(() => this.ticketsById.get(id) ?? null);
  }

  async listByOrder(orderId: string): Promise<Ticket[]> {
    return simulateLatency(() =>
      [...this.ticketsById.values()].filter((ticket) => ticket.orderId === orderId),
    );
  }

  async listAllocationsByOrder(orderId: string): Promise<Allocation[]> {
    return simulateLatency(() => {
      const ticketIdsForOrder = new Set(
        [...this.ticketsById.values()]
          .filter((ticket) => ticket.orderId === orderId)
          .map((ticket) => ticket.id),
      );
      return [...this.allocationsByLineItem.values()].filter((allocation) =>
        ticketIdsForOrder.has(allocation.ticketId),
      );
    });
  }

  async save(ticket: Ticket, allocations: Allocation[], expectedVersion: number): Promise<Ticket> {
    return simulateLatency(() => {
      const stored = this.ticketsById.get(ticket.id) ?? null;

      if (this.conflictTrigger.consumeForcedConflict()) {
        throw new ConflictError<Ticket>("Forced conflict (test/demo trigger)", stored ?? ticket);
      }

      if (stored && stored.version !== expectedVersion) {
        throw new ConflictError<Ticket>(
          `Ticket ${ticket.id} version conflict: expected ${expectedVersion}, stored ${stored.version}`,
          stored,
        );
      }

      const next: Ticket = { ...ticket, version: expectedVersion + 1 };
      this.ticketsById.set(ticket.id, next);
      for (const allocation of allocations) {
        this.allocationsByLineItem.set(allocation.lineItemId, allocation);
      }
      return next;
    });
  }
}
