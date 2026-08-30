import { describe, expect, it } from "vitest";
import { createLineItem, type LineItem } from "./line-item.js";

/**
 * Guard test (runtime half) — encodes risk #1 from the proposal: a future
 * contributor "simplifying" Allocation into a plain FK on LineItem would
 * silently destroy the fractional-splitting seam (see
 * `billing/model/allocation.ts`). See also the static source-scan half of
 * this guard in `__tests__/line-item-no-ticket-id.guard.test.ts`.
 */
describe("LineItem never exposes a ticketId (Allocation is the only path to a Ticket)", () => {
  it("a constructed LineItem instance has no ticketId property", () => {
    const lineItem: LineItem = createLineItem({
      orderId: "order-1",
      productId: "product-1",
      nameSnapshot: "Draft Beer 500ml",
      unitPriceCents: 350,
      quantity: 1,
      taxRateBp: 1_200,
    });

    expect(Object.prototype.hasOwnProperty.call(lineItem, "ticketId")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(lineItem, "ticket_id")).toBe(false);
    expect(JSON.stringify(lineItem)).not.toMatch(/ticket_id|ticketId/);
  });
});
