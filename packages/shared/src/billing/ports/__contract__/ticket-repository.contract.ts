import { describe, expect, it } from "vitest";
import { ConflictError } from "../../../errors/conflict-error.js";
import { createAllocation } from "../../model/allocation.js";
import { createTicket, type Ticket } from "../../model/ticket.js";
import type { TicketRepository } from "../ticket-repository.js";

/**
 * Implementation-agnostic conformance suite for `TicketRepository`.
 * Same rule as every contract suite in this repo: port semantics only,
 * no reliance on array insertion order, object identity, or synchronous
 * behavior — this suite must run unmodified against the Postgres adapter
 * at milestone 2.
 */
export function runTicketRepositoryContract(
  createRepository: () => TicketRepository | Promise<TicketRepository>,
): void {
  describe("TicketRepository contract", () => {
    it("returns null from findById when no ticket exists", async () => {
      const repository = await createRepository();
      const found = await repository.findById("ticket-does-not-exist");
      expect(found).toBeNull();
    });

    it("saves a ticket with its allocations and reads both back", async () => {
      const repository = await createRepository();
      const ticket = createTicket({ orderId: "order-1", label: "Ticket A" });
      const allocation = createAllocation({ lineItemId: "line-1", ticketId: ticket.id });

      const saved = await repository.save(ticket, [allocation], ticket.version);
      expect(saved.id).toBe(ticket.id);

      const found = await repository.findById(ticket.id);
      expect(found).not.toBeNull();
      expect(found?.label).toBe("Ticket A");

      const allocations = await repository.listAllocationsByOrder("order-1");
      const forThisLineItem = allocations.filter((entry) => entry.lineItemId === "line-1");
      expect(forThisLineItem).toHaveLength(1);
      expect(forThisLineItem[0]?.ticketId).toBe(ticket.id);
    });

    it("lists every ticket that belongs to an order, regardless of save order", async () => {
      const repository = await createRepository();
      const ticketA = createTicket({ orderId: "order-2", label: "A" });
      const ticketB = createTicket({ orderId: "order-2", label: "B" });

      await repository.save(ticketB, [], ticketB.version);
      await repository.save(ticketA, [], ticketA.version);

      const tickets = await repository.listByOrder("order-2");
      const labels = tickets.map((ticket) => ticket.label).sort();
      expect(labels).toEqual(["A", "B"]);
    });

    it("throws ConflictError when expectedVersion no longer matches the stored version", async () => {
      const repository = await createRepository();
      const ticket = createTicket({ orderId: "order-3", label: "Ticket" });
      const firstSave = await repository.save(ticket, [], ticket.version);

      await repository.save({ ...firstSave, status: "paid" }, [], firstSave.version);

      const staleWrite = repository.save({ ...firstSave, status: "void" }, [], firstSave.version);
      await expect(staleWrite).rejects.toBeInstanceOf(ConflictError);
    });

    it("carries the current stored snapshot on ConflictError", async () => {
      const repository = await createRepository();
      const ticket = createTicket({ orderId: "order-4", label: "Ticket" });
      const firstSave = await repository.save(ticket, [], ticket.version);
      const winner = await repository.save({ ...firstSave, status: "paid" }, [], firstSave.version);

      try {
        await repository.save({ ...firstSave, status: "void" }, [], firstSave.version);
        expect.unreachable("expected a stale save to throw ConflictError");
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictError);
        const conflict = error as ConflictError<Ticket>;
        expect(conflict.currentSnapshot.status).toBe(winner.status);
        expect(conflict.currentSnapshot.version).toBe(winner.version);
      }
    });
  });
}
