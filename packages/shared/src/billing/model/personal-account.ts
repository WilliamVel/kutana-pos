import { createUuid } from "../../platform/uuid.js";
import { ValidationError } from "../../errors/domain-error.js";
import type { LineItem } from "../../ordering/model/line-item.js";

export interface Customer {
  readonly id: string;
  readonly displayName: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type PersonalAccountStatus = "open" | "partially_paid" | "pending" | "paid" | "void";

export type PersonalAccountOwner =
  | { readonly kind: "customer"; readonly customerId: string }
  | { readonly kind: "free_name"; readonly freeName: string };

export interface PersonalAccount {
  readonly id: string;
  readonly orderId: string;
  readonly owner: PersonalAccountOwner;
  readonly status: PersonalAccountStatus;
  readonly createdAt: string;
  readonly closedAt: string | null;
  readonly version: number;
}

export interface AccountLineAllocation {
  readonly id: string;
  readonly accountId: string;
  readonly lineItemId: string;
  readonly quantity: number;
}

export interface AccountPaymentAmount {
  readonly accountId: string;
  readonly amountCents: number;
}

export interface AccountBalance {
  readonly totalCents: number;
  readonly paidCents: number;
  readonly remainingCents: number;
}

export function createCustomer(input: {
  displayName: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  id?: string;
  now?: string;
}): Customer {
  const displayName = input.displayName.trim();
  if (displayName.length === 0) {
    throw new ValidationError("Customer displayName must be non-empty");
  }
  const now = input.now ?? new Date().toISOString();
  return {
    id: input.id ?? createUuid(),
    displayName,
    phone: input.phone ?? null,
    email: input.email ?? null,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export function createPersonalAccount(input: {
  orderId: string;
  customerId?: string | null;
  freeName?: string | null;
  id?: string;
  createdAt?: string;
}): PersonalAccount {
  const customerId = input.customerId?.trim() || null;
  const freeName = input.freeName?.trim() || null;

  if (input.freeName !== undefined && input.freeName !== null && freeName === null) {
    throw new ValidationError("PersonalAccount free-name owner must be non-empty");
  }
  if ((customerId === null && freeName === null) || (customerId !== null && freeName !== null)) {
    throw new ValidationError(
      "PersonalAccount must have exactly one owner: an identified customer or a free-name label",
    );
  }

  return {
    id: input.id ?? createUuid(),
    orderId: input.orderId,
    owner:
      customerId !== null ? { kind: "customer", customerId } : { kind: "free_name", freeName: freeName! },
    status: "open",
    createdAt: input.createdAt ?? new Date().toISOString(),
    closedAt: null,
    version: 1,
  };
}

export function createAccountLineAllocation(input: {
  accountId: string;
  lineItemId: string;
  quantity: number;
  id?: string;
}): AccountLineAllocation {
  if ("amountCents" in input) {
    throw new ValidationError("AccountLineAllocation supports quantity only, not amount-based splits");
  }
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new ValidationError("AccountLineAllocation quantity must be positive");
  }
  return {
    id: input.id ?? createUuid(),
    accountId: input.accountId,
    lineItemId: input.lineItemId,
    quantity: input.quantity,
  };
}

export function addAccountLineAllocation(input: {
  allocations: readonly AccountLineAllocation[];
  lineItems: readonly LineItem[];
  next: AccountLineAllocation;
}): { allocations: AccountLineAllocation[]; remainingQuantityByLineItem: Record<string, number> } {
  const lineItem = input.lineItems.find((item) => item.id === input.next.lineItemId);
  if (!lineItem) {
    throw new ValidationError(`LineItem ${input.next.lineItemId} does not exist`);
  }

  const allocations = [...input.allocations, input.next];
  const remainingQuantityByLineItem = remainingQuantities(input.lineItems, allocations);
  const remainingQuantity = remainingQuantityByLineItem[lineItem.id] ?? lineItem.quantity;
  if (remainingQuantity < 0) {
    throw new ValidationError(`Cannot over-allocate LineItem ${lineItem.id}`);
  }

  return { allocations, remainingQuantityByLineItem };
}

export function accountBalance(input: {
  accountId: string;
  lineItems: readonly LineItem[];
  allocations: readonly AccountLineAllocation[];
  payments: readonly AccountPaymentAmount[];
}): AccountBalance {
  const lineItemsById = new Map(input.lineItems.map((item) => [item.id, item]));
  const totalCents = input.allocations
    .filter((allocation) => allocation.accountId === input.accountId)
    .reduce((sum, allocation) => {
      const lineItem = lineItemsById.get(allocation.lineItemId);
      if (!lineItem) {
        throw new ValidationError(`LineItem ${allocation.lineItemId} does not exist`);
      }
      return sum + Math.round((lineItem.totalCents / lineItem.quantity) * allocation.quantity);
    }, 0);
  const paidCents = input.payments
    .filter((payment) => payment.accountId === input.accountId)
    .reduce((sum, payment) => sum + payment.amountCents, 0);

  return { totalCents, paidCents, remainingCents: Math.max(0, totalCents - paidCents) };
}

export function derivePersonalAccountStatus(input: {
  totalCents: number;
  paidCents: number;
  isPending: boolean;
}): PersonalAccountStatus {
  if (input.isPending) {
    return "pending";
  }
  if (input.paidCents >= input.totalCents && input.totalCents > 0) {
    return "paid";
  }
  if (input.paidCents > 0) {
    return "partially_paid";
  }
  return "open";
}

function remainingQuantities(
  lineItems: readonly LineItem[],
  allocations: readonly AccountLineAllocation[],
): Record<string, number> {
  return Object.fromEntries(
    lineItems.map((lineItem) => {
      const allocated = allocations
        .filter((allocation) => allocation.lineItemId === lineItem.id)
        .reduce((sum, allocation) => sum + allocation.quantity, 0);
      return [lineItem.id, lineItem.quantity - allocated];
    }),
  );
}
