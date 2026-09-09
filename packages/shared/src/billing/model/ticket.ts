import { createUuid } from "../../platform/uuid.js";
/**
 * @deprecated Milestone-1 compatibility model. `PersonalAccount` is the payable
 * unit for new account assignment and pending-debt flows.
 */
export type TicketStatus = "open" | "paid" | "void";

export interface Ticket {
  readonly id: string;
  readonly orderId: string;
  readonly label: string;
  readonly status: TicketStatus;
  readonly version: number;
}

export function createTicket(input: { orderId: string; label: string; id?: string }): Ticket {
  return {
    id: input.id ?? createUuid(),
    orderId: input.orderId,
    label: input.label,
    status: "open",
    version: 1,
  };
}

export function withStatus(ticket: Ticket, status: TicketStatus): Ticket {
  return { ...ticket, status, version: ticket.version + 1 };
}
