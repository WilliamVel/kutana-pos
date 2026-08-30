import { Money } from "../../money/money.js";
import type { LineItem } from "../../ordering/model/line-item.js";
import { ValidationError } from "../../errors/domain-error.js";
import { type Allocation, repointAllocation } from "../model/allocation.js";
import type { Ticket } from "../model/ticket.js";

export interface TicketPayment {
  readonly ticketId: string;
  readonly amountCents: number;
}

/**
 * Sums the total of every LineItem currently allocated to `ticketId`.
 * Pure and infrastructure-free: the single source of truth for "what does
 * this ticket currently owe", used by both the split/merge services and
 * (later) the register UI.
 */
export function ticketTotals(
  ticketId: string,
  lineItems: readonly LineItem[],
  allocations: readonly Allocation[],
): Money {
  const allocatedLineItemIds = new Set(
    allocations
      .filter((allocation) => allocation.ticketId === ticketId)
      .map((allocation) => allocation.lineItemId),
  );

  return lineItems
    .filter((item) => allocatedLineItemIds.has(item.id))
    .reduce((sum, item) => sum.add(Money.fromCents(item.totalCents)), Money.zero());
}

function findTicketOrThrow(tickets: readonly Ticket[], ticketId: string): Ticket {
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) {
    throw new ValidationError(`Ticket not found: ${ticketId}`);
  }
  return ticket;
}

function assertTicketNotPaid(ticket: Ticket): void {
  if (ticket.status === "paid") {
    throw new ValidationError(`Cannot modify Ticket ${ticket.id}: it is already paid`);
  }
}

/**
 * Guards against recording a payment on a ticket that currently has zero
 * allocated LineItems (e.g. right after its last item was moved away).
 */
export function assertCanReceivePayment(
  ticketId: string,
  lineItems: readonly LineItem[],
  allocations: readonly Allocation[],
): void {
  const total = ticketTotals(ticketId, lineItems, allocations);
  if (total.cents === 0) {
    throw new ValidationError(`Ticket ${ticketId} is empty and cannot accept payment`);
  }
}

/**
 * "Splitting a bill" = repointing an Allocation's ticketId. The LineItem
 * itself is never moved, copied, or mutated — only the Allocation entry
 * that maps it to a Ticket changes.
 */
export function splitAllocation(input: {
  allocations: readonly Allocation[];
  tickets: readonly Ticket[];
  lineItemId: string;
  toTicketId: string;
  payments: readonly TicketPayment[];
}): { allocations: Allocation[] } {
  const existingAllocation = input.allocations.find(
    (allocation) => allocation.lineItemId === input.lineItemId,
  );
  if (!existingAllocation) {
    throw new ValidationError(`LineItem ${input.lineItemId} has no existing allocation to split`);
  }

  const fromTicket = findTicketOrThrow(input.tickets, existingAllocation.ticketId);
  const toTicket = findTicketOrThrow(input.tickets, input.toTicketId);
  assertTicketNotPaid(fromTicket);
  assertTicketNotPaid(toTicket);

  const allocations = repointAllocation(input.allocations, input.lineItemId, input.toTicketId);

  return { allocations };
}

/**
 * Re-merges `fromTicketId` into `intoTicketId`: every Allocation currently
 * pointing at `fromTicketId` is repointed to `intoTicketId`. The source
 * ticket ends with zero allocations (callers may then void/remove it).
 */
export function mergeTickets(input: {
  allocations: readonly Allocation[];
  tickets: readonly Ticket[];
  fromTicketId: string;
  intoTicketId: string;
}): { allocations: Allocation[] } {
  const fromTicket = findTicketOrThrow(input.tickets, input.fromTicketId);
  const intoTicket = findTicketOrThrow(input.tickets, input.intoTicketId);
  assertTicketNotPaid(fromTicket);
  assertTicketNotPaid(intoTicket);

  const allocations = input.allocations.map((allocation) =>
    allocation.ticketId === input.fromTicketId
      ? { ...allocation, ticketId: input.intoTicketId }
      : allocation,
  );

  return { allocations };
}
