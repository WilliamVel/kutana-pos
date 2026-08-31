import type { Order } from "../../ordering/model/order.js";
import type { LineItem } from "../../ordering/model/line-item.js";
import {
  accountBalance,
  type AccountLineAllocation,
  type AccountPaymentAmount,
  type PersonalAccount,
} from "./personal-account.js";

export interface UnresolvedLineItemQuantity {
  readonly lineItemId: string;
  readonly soldQuantity: number;
  readonly assignedQuantity: number;
  /** Positive means unassigned; negative means over-assigned. */
  readonly unresolvedQuantity: number;
}

export interface BlockingAccountResolution {
  readonly accountId: string;
  readonly status: PersonalAccount["status"];
  readonly remainingCents: number;
}

export type OrderClosureResult =
  | {
      readonly kind: "closed";
      readonly order: Order;
      readonly pendingAccountIds: readonly string[];
    }
  | {
      readonly kind: "review_required";
      readonly order: Order;
      readonly unresolvedLineItems: readonly UnresolvedLineItemQuantity[];
      readonly blockingAccounts: readonly BlockingAccountResolution[];
    };

export function closeOrderWithPersonalAccounts(input: {
  readonly order: Order;
  readonly accounts: readonly PersonalAccount[];
  readonly allocations: readonly AccountLineAllocation[];
  readonly payments: readonly AccountPaymentAmount[];
  readonly closedAt?: string;
}): OrderClosureResult {
  const unresolvedLineItems = findUnresolvedLineItemQuantities(input.order.lineItems, input.allocations);
  const blockingAccounts = findBlockingAccounts(input.accounts, input.order.lineItems, input.allocations, input.payments);

  if (unresolvedLineItems.length > 0 || blockingAccounts.length > 0) {
    return {
      kind: "review_required",
      order: closeAttemptOrder(input.order, "in_review", null),
      unresolvedLineItems,
      blockingAccounts,
    };
  }

  const pendingAccountIds = input.accounts.filter((account) => account.status === "pending").map((account) => account.id);
  return {
    kind: "closed",
    order: closeAttemptOrder(
      input.order,
      pendingAccountIds.length > 0 ? "closed_with_pending" : "paid",
      input.closedAt ?? new Date().toISOString(),
    ),
    pendingAccountIds,
  };
}

function findUnresolvedLineItemQuantities(
  lineItems: readonly LineItem[],
  allocations: readonly AccountLineAllocation[],
): UnresolvedLineItemQuantity[] {
  return lineItems.flatMap((lineItem) => {
    const assignedQuantity = allocations
      .filter((allocation) => allocation.lineItemId === lineItem.id)
      .reduce((sum, allocation) => sum + allocation.quantity, 0);
    const unresolvedQuantity = lineItem.quantity - assignedQuantity;
    if (unresolvedQuantity === 0) {
      return [];
    }
    return [{ lineItemId: lineItem.id, soldQuantity: lineItem.quantity, assignedQuantity, unresolvedQuantity }];
  });
}

function findBlockingAccounts(
  accounts: readonly PersonalAccount[],
  lineItems: readonly LineItem[],
  allocations: readonly AccountLineAllocation[],
  payments: readonly AccountPaymentAmount[],
): BlockingAccountResolution[] {
  return accounts.flatMap((account): BlockingAccountResolution[] => {
    if (account.status === "pending" || account.status === "void") {
      return account.status === "pending" ? [] : [{ accountId: account.id, status: account.status, remainingCents: 0 }];
    }

    const balance = accountBalance({ accountId: account.id, lineItems, allocations, payments });
    const isPaid = account.status === "paid" || (balance.totalCents > 0 && balance.remainingCents === 0);
    if (isPaid) {
      return [];
    }

    return [{ accountId: account.id, status: account.status, remainingCents: balance.remainingCents }];
  });
}

function closeAttemptOrder(order: Order, status: Order["status"], closedAt: string | null): Order {
  return {
    ...order,
    status,
    closedAt,
    lineItems: order.lineItems,
    version: order.version + 1,
  };
}
