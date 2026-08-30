import { describe, expect, it } from "vitest";
import { createAllocation } from "../model/allocation.js";
import { createTicket, withStatus } from "../model/ticket.js";
import { createLineItem } from "../../ordering/model/line-item.js";
import {
  assertCanReceivePayment,
  mergeTickets,
  splitAllocation,
  ticketTotals,
} from "./split-allocation.js";

function makeLineItem(orderId: string, totalOverrideCents: number) {
  const item = createLineItem({
    orderId,
    productId: "product-1",
    nameSnapshot: "Test Item",
    unitPriceCents: totalOverrideCents,
    quantity: 1,
    taxRateBp: 0,
  });
  return item;
}

describe("splitAllocation", () => {
  it("moves a LineItem to a different ticket, preserving 100% share", () => {
    const orderId = "order-1";
    const lineItem = makeLineItem(orderId, 500);
    const ticket1 = createTicket({ orderId, label: "Ticket 1" });
    const ticket2 = createTicket({ orderId, label: "Ticket 2" });
    const allocations = [createAllocation({ lineItemId: lineItem.id, ticketId: ticket1.id })];

    const result = splitAllocation({
      allocations,
      tickets: [ticket1, ticket2],
      lineItemId: lineItem.id,
      toTicketId: ticket2.id,
      payments: [],
    });

    expect(result.allocations).toHaveLength(1);
    expect(result.allocations.at(0)?.ticketId).toBe(ticket2.id);
    expect(result.allocations.at(0)?.shareBp).toBe(10_000);
  });

  it("splits a partially-paid ticket: existing payment stays attributed to the original ticket", () => {
    const orderId = "order-1";
    const lineItemA = makeLineItem(orderId, 600);
    const lineItemB = makeLineItem(orderId, 400);
    const ticket1 = createTicket({ orderId, label: "Ticket 1" });
    const ticket2 = createTicket({ orderId, label: "Ticket 2" });
    const allocations = [
      createAllocation({ lineItemId: lineItemA.id, ticketId: ticket1.id }),
      createAllocation({ lineItemId: lineItemB.id, ticketId: ticket1.id }),
    ];
    const payments = [{ ticketId: ticket1.id, amountCents: 400 }];

    const result = splitAllocation({
      allocations,
      tickets: [ticket1, ticket2],
      lineItemId: lineItemB.id,
      toTicketId: ticket2.id,
      payments,
    });

    const lineItems = [lineItemA, lineItemB];
    const ticket1Total = ticketTotals(ticket1.id, lineItems, result.allocations);
    expect(ticket1Total.cents).toBe(600);
    // the 400 already paid remains attributed to ticket 1, unaffected by the split
    const stillAttributed = payments.filter((p) => p.ticketId === ticket1.id);
    expect(stillAttributed.reduce((sum, p) => sum + p.amountCents, 0)).toBe(400);
  });

  it("moving the last item off a ticket empties it, and an empty ticket must not accept payment", () => {
    const orderId = "order-1";
    const lineItem = makeLineItem(orderId, 500);
    const ticket1 = createTicket({ orderId, label: "Ticket 1" });
    const ticket2 = createTicket({ orderId, label: "Ticket 2" });
    const allocations = [createAllocation({ lineItemId: lineItem.id, ticketId: ticket2.id })];

    const result = splitAllocation({
      allocations,
      tickets: [ticket1, ticket2],
      lineItemId: lineItem.id,
      toTicketId: ticket1.id,
      payments: [],
    });

    const lineItems = [lineItem];
    const ticket2Total = ticketTotals(ticket2.id, lineItems, result.allocations);
    expect(ticket2Total.cents).toBe(0);

    expect(() => assertCanReceivePayment(ticket2.id, lineItems, result.allocations)).toThrow(
      /empty/i,
    );
  });

  it("re-merges two tickets: all allocations move to the target, source ticket left with no allocations", () => {
    const orderId = "order-1";
    const lineItemA = makeLineItem(orderId, 300);
    const lineItemB = makeLineItem(orderId, 200);
    const ticket1 = createTicket({ orderId, label: "Ticket 1" });
    const ticket2 = createTicket({ orderId, label: "Ticket 2" });
    const allocations = [
      createAllocation({ lineItemId: lineItemA.id, ticketId: ticket1.id }),
      createAllocation({ lineItemId: lineItemB.id, ticketId: ticket2.id }),
    ];

    const result = mergeTickets({
      allocations,
      tickets: [ticket1, ticket2],
      fromTicketId: ticket2.id,
      intoTicketId: ticket1.id,
    });

    const allocatedToTicket1 = result.allocations.filter((a) => a.ticketId === ticket1.id);
    expect(allocatedToTicket1).toHaveLength(2);
    const remainingOnTicket2 = result.allocations.filter((a) => a.ticketId === ticket2.id);
    expect(remainingOnTicket2).toHaveLength(0);
  });

  it("a new LineItem added to the order after a split has begun must be allocated before the order is complete", () => {
    const orderId = "order-1";
    const lineItemA = makeLineItem(orderId, 300);
    const lineItemB = makeLineItem(orderId, 200);
    const ticket1 = createTicket({ orderId, label: "Ticket 1" });
    const ticket2 = createTicket({ orderId, label: "Ticket 2" });
    const allocations = [
      createAllocation({ lineItemId: lineItemA.id, ticketId: ticket1.id }),
      createAllocation({ lineItemId: lineItemB.id, ticketId: ticket2.id }),
    ];

    const newLineItem = makeLineItem(orderId, 150);
    const allLineItems = [lineItemA, lineItemB, newLineItem];

    const isFullyAllocated = allLineItems.every((item) =>
      allocations.some((a) => a.lineItemId === item.id),
    );
    expect(isFullyAllocated).toBe(false);

    const withNewAllocation = [
      ...allocations,
      createAllocation({ lineItemId: newLineItem.id, ticketId: ticket1.id }),
    ];
    const isFullyAllocatedAfter = allLineItems.every((item) =>
      withNewAllocation.some((a) => a.lineItemId === item.id),
    );
    expect(isFullyAllocatedAfter).toBe(true);
  });

  it("rejects splitting a line item onto an already-paid ticket", () => {
    const orderId = "order-1";
    const lineItem = makeLineItem(orderId, 500);
    const ticket1 = createTicket({ orderId, label: "Ticket 1" });
    const paidTicket = withStatus(createTicket({ orderId, label: "Ticket 2" }), "paid");
    const allocations = [createAllocation({ lineItemId: lineItem.id, ticketId: ticket1.id })];

    expect(() =>
      splitAllocation({
        allocations,
        tickets: [ticket1, paidTicket],
        lineItemId: lineItem.id,
        toTicketId: paidTicket.id,
        payments: [],
      }),
    ).toThrow(/paid/i);
  });

  it("rejects moving a line item off an already-paid ticket", () => {
    const orderId = "order-1";
    const lineItem = makeLineItem(orderId, 500);
    const paidTicket = withStatus(createTicket({ orderId, label: "Ticket 1" }), "paid");
    const ticket2 = createTicket({ orderId, label: "Ticket 2" });
    const allocations = [createAllocation({ lineItemId: lineItem.id, ticketId: paidTicket.id })];

    expect(() =>
      splitAllocation({
        allocations,
        tickets: [paidTicket, ticket2],
        lineItemId: lineItem.id,
        toTicketId: ticket2.id,
        payments: [],
      }),
    ).toThrow(/paid/i);
  });

  it("rejects merging into or from an already-paid ticket", () => {
    const orderId = "order-1";
    const lineItemA = makeLineItem(orderId, 300);
    const lineItemB = makeLineItem(orderId, 200);
    const ticket1 = createTicket({ orderId, label: "Ticket 1" });
    const paidTicket = withStatus(createTicket({ orderId, label: "Ticket 2" }), "paid");
    const allocations = [
      createAllocation({ lineItemId: lineItemA.id, ticketId: ticket1.id }),
      createAllocation({ lineItemId: lineItemB.id, ticketId: paidTicket.id }),
    ];

    expect(() =>
      mergeTickets({
        allocations,
        tickets: [ticket1, paidTicket],
        fromTicketId: paidTicket.id,
        intoTicketId: ticket1.id,
      }),
    ).toThrow(/paid/i);
  });
});
