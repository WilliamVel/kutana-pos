import { ValidationError } from "../../errors/domain-error.js";
import type { PersonalAccount } from "./personal-account.js";

export type CustomerDebtEntryKind = "pending_account" | "payment" | "adjustment";
export type CustomerDebtDirection = "debit" | "credit";

export interface CustomerDebtEntry {
  readonly id: string;
  readonly customerId: string;
  readonly kind: CustomerDebtEntryKind;
  readonly direction: CustomerDebtDirection;
  readonly amountCents: number;
  readonly accountId: string | null;
  readonly paymentId: string | null;
  readonly note: string | null;
  readonly createdAt: string;
}

export function createCustomerDebtEntry(input: {
  customerId: string;
  direction: CustomerDebtDirection;
  amountCents: number;
  kind?: CustomerDebtEntryKind;
  accountId?: string | null;
  paymentId?: string | null;
  note?: string | null;
  id?: string;
  createdAt?: string;
}): CustomerDebtEntry {
  if (input.customerId.trim().length === 0) {
    throw new ValidationError("CustomerDebtEntry customerId must be non-empty");
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new ValidationError("CustomerDebtEntry amountCents must be a positive integer");
  }

  return {
    id: input.id ?? crypto.randomUUID(),
    customerId: input.customerId,
    kind: input.kind ?? (input.direction === "credit" ? "payment" : "pending_account"),
    direction: input.direction,
    amountCents: input.amountCents,
    accountId: input.accountId ?? null,
    paymentId: input.paymentId ?? null,
    note: input.note ?? null,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function customerDebtBalance(input: {
  entries: readonly CustomerDebtEntry[];
  customerId: string;
}): number {
  return input.entries
    .filter((entry) => entry.customerId === input.customerId)
    .reduce((sum, entry) => sum + (entry.direction === "debit" ? entry.amountCents : -entry.amountCents), 0);
}

export function recordPendingAccountDebt(input: {
  entries: readonly CustomerDebtEntry[];
  account: PersonalAccount;
  remainingCents: number;
  id?: string;
  createdAt?: string;
}): { entries: CustomerDebtEntry[]; entry: CustomerDebtEntry | null } {
  if (input.account.owner.kind === "free_name") {
    return { entries: [...input.entries], entry: null };
  }

  const entry = createCustomerDebtEntry({
    id: input.id,
    customerId: input.account.owner.customerId,
    kind: "pending_account",
    direction: "debit",
    amountCents: input.remainingCents,
    accountId: input.account.id,
    createdAt: input.createdAt,
  });

  return { entries: [...input.entries, entry], entry };
}

export function recordCustomerDebtPayment(input: {
  entries: readonly CustomerDebtEntry[];
  customerId: string;
  amountCents: number;
  paymentId: string;
  id?: string;
  createdAt?: string;
}): { entries: CustomerDebtEntry[]; entry: CustomerDebtEntry } {
  const entry = createCustomerDebtEntry({
    id: input.id,
    customerId: input.customerId,
    kind: "payment",
    direction: "credit",
    amountCents: input.amountCents,
    paymentId: input.paymentId,
    createdAt: input.createdAt,
  });

  return { entries: [...input.entries, entry], entry };
}
