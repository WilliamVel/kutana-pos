import { describe, expect, it } from "vitest";
import { createPersonalAccount } from "./personal-account.js";
import {
  createCustomerDebtEntry,
  customerDebtBalance,
  recordCustomerDebtPayment,
  recordPendingAccountDebt,
} from "./customer-debt-ledger.js";

describe("CustomerDebtLedger", () => {
  it("records append-only debit and credit entries without mutating existing history", () => {
    const existing = [
      createCustomerDebtEntry({
        id: "debt-1",
        customerId: "customer-1",
        kind: "pending_account",
        direction: "debit",
        amountCents: 1000,
        accountId: "account-1",
        createdAt: "2025-01-01T00:00:00.000Z",
      }),
    ];

    const next = recordCustomerDebtPayment({
      entries: existing,
      customerId: "customer-1",
      amountCents: 400,
      paymentId: "payment-1",
      id: "debt-2",
      createdAt: "2025-01-02T00:00:00.000Z",
    });

    expect(existing).toHaveLength(1);
    expect(next.entries).toHaveLength(2);
    expect(next.entry).toMatchObject({
      id: "debt-2",
      customerId: "customer-1",
      kind: "payment",
      direction: "credit",
      amountCents: 400,
      paymentId: "payment-1",
    });
  });

  it("derives customer debt balance from debit entries minus credit entries", () => {
    const entries = [
      createCustomerDebtEntry({ customerId: "customer-1", direction: "debit", amountCents: 1000 }),
      createCustomerDebtEntry({ customerId: "customer-1", direction: "debit", amountCents: 500 }),
      createCustomerDebtEntry({ customerId: "customer-1", direction: "credit", amountCents: 600 }),
      createCustomerDebtEntry({ customerId: "customer-2", direction: "debit", amountCents: 900 }),
    ];

    expect(customerDebtBalance({ entries, customerId: "customer-1" })).toBe(900);
  });

  it("accumulates identified customer debt across multiple visits", () => {
    const firstVisit = recordPendingAccountDebt({
      entries: [],
      account: createPersonalAccount({ id: "account-1", orderId: "order-1", customerId: "customer-1" }),
      remainingCents: 1000,
      id: "debt-1",
    });
    const secondVisit = recordPendingAccountDebt({
      entries: firstVisit.entries,
      account: createPersonalAccount({ id: "account-2", orderId: "order-2", customerId: "customer-1" }),
      remainingCents: 500,
      id: "debt-2",
    });

    expect(customerDebtBalance({ entries: secondVisit.entries, customerId: "customer-1" })).toBe(1500);
  });

  it("records partial later payment as a credit against customer debt", () => {
    const entries = [
      createCustomerDebtEntry({ customerId: "customer-1", direction: "debit", amountCents: 1500 }),
    ];

    const result = recordCustomerDebtPayment({
      entries,
      customerId: "customer-1",
      amountCents: 600,
      paymentId: "payment-1",
      id: "credit-1",
    });

    expect(result.entry.direction).toBe("credit");
    expect(customerDebtBalance({ entries: result.entries, customerId: "customer-1" })).toBe(900);
  });

  it("creates a customer debt debit when an identified customer account is marked pending", () => {
    const account = createPersonalAccount({ id: "account-1", orderId: "order-1", customerId: "customer-1" });

    const result = recordPendingAccountDebt({
      entries: [],
      account,
      remainingCents: 600,
      id: "debit-1",
    });

    expect(result.entry).toMatchObject({
      id: "debit-1",
      customerId: "customer-1",
      kind: "pending_account",
      direction: "debit",
      amountCents: 600,
      accountId: "account-1",
    });
  });

  it("does not create a customer debt entry for free-name pending accounts", () => {
    const account = createPersonalAccount({ id: "account-1", orderId: "order-1", freeName: "Juan P." });

    const result = recordPendingAccountDebt({ entries: [], account, remainingCents: 600 });

    expect(result.entry).toBeNull();
    expect(result.entries).toEqual([]);
  });
});
