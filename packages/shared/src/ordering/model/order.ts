import { ValidationError } from "../../errors/domain-error.js";
import type { LineItem } from "./line-item.js";

export type OrderStatus = "active" | "needs_check" | "in_review" | "paid" | "closed_with_pending";

/**
 * An Order's `lineItems` array only ever grows — LineItems are immutable
 * and are never spliced, replaced, or edited in place. Corrections are
 * appended as new adjustment lines (see `services/line-item-service.ts`).
 * `version` is the optimistic-concurrency token used by `OrderRepository`.
 */
export interface Order {
  readonly id: string;
  readonly tableId: string;
  readonly status: OrderStatus;
  readonly lineItems: readonly LineItem[];
  readonly openedAt: string;
  readonly closedAt: string | null;
  readonly customerId: string | null;
  readonly version: number;
}

export function createOrder(input: {
  tableId: string;
  customerId?: string | null;
  id?: string;
  openedAt?: string;
}): Order {
  return {
    id: input.id ?? crypto.randomUUID(),
    tableId: input.tableId,
    status: "active",
    lineItems: [],
    openedAt: input.openedAt ?? new Date().toISOString(),
    closedAt: null,
    customerId: input.customerId ?? null,
    version: 1,
  };
}

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  active: ["needs_check"],
  needs_check: ["paid"],
  in_review: ["needs_check"],
  paid: [],
  closed_with_pending: [],
};

function transition(order: Order, to: OrderStatus): Order {
  const allowed = ALLOWED_TRANSITIONS[order.status];
  if (!allowed.includes(to)) {
    throw new ValidationError(`Order cannot transition from '${order.status}' to '${to}'`);
  }
  return {
    ...order,
    status: to,
    closedAt: to === "paid" ? new Date().toISOString() : order.closedAt,
    version: order.version + 1,
  };
}

export function requestCheck(order: Order): Order {
  return transition(order, "needs_check");
}

export function markPaid(order: Order): Order {
  return transition(order, "paid");
}

export function isOrderModifiable(order: Order): boolean {
  return order.status !== "paid" && order.status !== "closed_with_pending";
}
