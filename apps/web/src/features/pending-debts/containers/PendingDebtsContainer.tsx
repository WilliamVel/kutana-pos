import { createUuid } from "@kutana/shared/platform/uuid.js";
import { useCallback, useEffect, useState } from "react";
import { accountBalance, createCustomer, type AccountLineAllocation, type Customer, type PersonalAccount } from "@kutana/shared/billing/model/personal-account.js";
import { createCustomerDebtEntry, customerDebtBalance } from "@kutana/shared/billing/model/customer-debt-ledger.js";
import type { CustomerDebtEntry } from "@kutana/shared/billing/model/customer-debt-ledger.js";
import type { Order } from "@kutana/shared/ordering/model/order.js";
import type { Payment } from "@kutana/shared/payments/model/payment.js";
import { useCustomerDebts, useCustomers, useOrders, usePaymentMethods, usePayments, usePersonalAccounts } from "../../../composition/PortsProvider.js";
import { PendingDebtsView, type PendingCustomerDebtRow, type UnlinkedPendingAccountRow } from "../components/PendingDebtsView.js";

interface AccountContext {
  readonly account: PersonalAccount;
  readonly order: Order;
  readonly allocations: readonly AccountLineAllocation[];
  readonly remainingCents: number;
}

export function PendingDebtsContainer(): JSX.Element {
  const customersPort = useCustomers();
  const debtsPort = useCustomerDebts();
  const accountsPort = usePersonalAccounts();
  const ordersPort = useOrders();
  const paymentsPort = usePayments();
  const methods = usePaymentMethods();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerDebts, setCustomerDebts] = useState<PendingCustomerDebtRow[]>([]);
  const [unlinkedAccounts, setUnlinkedAccounts] = useState<UnlinkedPendingAccountRow[]>([]);
  const [customerPaymentDrafts, setCustomerPaymentDrafts] = useState<Record<string, string>>({});
  const [accountPaymentDrafts, setAccountPaymentDrafts] = useState<Record<string, string>>({});
  const [linkCustomerDrafts, setLinkCustomerDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const [allCustomers, entries, orders, pendingAccounts] = await Promise.all([
      customersPort.listAll(),
      debtsPort.listAll(),
      ordersPort.listAll(),
      accountsPort.listPendingFreeName(),
    ]);
    setCustomers(allCustomers);
    setCustomerDebts(toCustomerDebtRows(entries, allCustomers));
    setUnlinkedAccounts(await toUnlinkedRows(pendingAccounts, orders, accountsPort, paymentsPort));
  }, [accountsPort, customersPort, debtsPort, ordersPort, paymentsPort]);

  useEffect(() => {
    void load();
  }, [load]);

  const runMutation = useCallback(async (mutation: () => Promise<string>): Promise<void> => {
    setBusy(true);
    try {
      const nextMessage = await mutation();
      setMessage(nextMessage);
      await load();
    } finally {
      setBusy(false);
    }
  }, [load]);

  const recordPayment = async (target: Payment["target"], amountCents: number): Promise<Payment> => {
    const method = methods.find((candidate) => candidate.active) ?? methods[0];
    if (!method) throw new Error("No hay un método de pago activo configurado");
    return paymentsPort.record({
      id: createUuid(),
      target,
      methodCode: method.code,
      amountCents,
      tenderedCents: method.requiresTendered ? amountCents : null,
      changeCents: method.requiresTendered ? 0 : null,
      recordedAt: new Date().toISOString(),
    });
  };

  const payCustomerDebt = (customerId: string): void => {
    void runMutation(async () => {
      const amountCents = positiveDraft(customerPaymentDrafts[customerId]);
      const payment = await recordPayment({ kind: "customer_debt", customerId }, amountCents);
      await debtsPort.record(createCustomerDebtEntry({
        customerId,
        direction: "credit",
        kind: "payment",
        amountCents,
        paymentId: payment.id,
      }));
      setCustomerPaymentDrafts((drafts) => ({ ...drafts, [customerId]: "" }));
      return "Pago de deuda registrado sin reabrir la mesa original.";
    });
  };

  const payUnlinkedAccount = (accountId: string): void => {
    void runMutation(async () => {
      const amountCents = positiveDraft(accountPaymentDrafts[accountId]);
      const context = await getAccountContext(accountId, accountsPort, ordersPort, paymentsPort);
      await recordPayment({ kind: "personal_account", accountId }, Math.min(amountCents, context.remainingCents));
      if (amountCents >= context.remainingCents) {
        await accountsPort.save({ ...context.account, status: "paid", closedAt: new Date().toISOString() }, context.allocations, context.account.version);
      }
      setAccountPaymentDrafts((drafts) => ({ ...drafts, [accountId]: "" }));
      return "Pago de cuenta pendiente registrado.";
    });
  };

  const linkToCustomer = (accountId: string): void => {
    void runMutation(async () => {
      const customerId = linkCustomerDrafts[accountId];
      if (!customerId) throw new Error("Selecciona un cliente antes de vincular la cuenta");
      const context = await getAccountContext(accountId, accountsPort, ordersPort, paymentsPort);
      const linked = { ...context.account, owner: { kind: "customer" as const, customerId } };
      await accountsPort.save(linked, context.allocations, context.account.version);
      if (context.remainingCents > 0) {
        await debtsPort.record(createCustomerDebtEntry({
          customerId,
          direction: "debit",
          kind: "pending_account",
          amountCents: context.remainingCents,
          accountId,
        }));
      }
      setLinkCustomerDrafts((drafts) => ({ ...drafts, [accountId]: "" }));
      return "Cuenta con nombre libre vinculada a un cliente existente.";
    });
  };

  const createCustomerFromAccount = (accountId: string): void => {
    void runMutation(async () => {
      const context = await getAccountContext(accountId, accountsPort, ordersPort, paymentsPort);
      if (context.account.owner.kind !== "free_name") throw new Error("La cuenta ya está vinculada");
      const customer = await customersPort.save(createCustomer({ displayName: context.account.owner.freeName }));
      const linked = { ...context.account, owner: { kind: "customer" as const, customerId: customer.id } };
      await accountsPort.save(linked, context.allocations, context.account.version);
      if (context.remainingCents > 0) {
        await debtsPort.record(createCustomerDebtEntry({
          customerId: customer.id,
          direction: "debit",
          kind: "pending_account",
          amountCents: context.remainingCents,
          accountId,
        }));
      }
      return "Cliente creado desde la cuenta con nombre libre y vinculado.";
    });
  };

  return (
    <PendingDebtsView
      customerDebts={customerDebts}
      unlinkedAccounts={unlinkedAccounts}
      customers={customers}
      customerPaymentDrafts={customerPaymentDrafts}
      accountPaymentDrafts={accountPaymentDrafts}
      linkCustomerDrafts={linkCustomerDrafts}
      disabled={busy}
      message={message}
      onCustomerPaymentDraftChange={(customerId, amount) => setCustomerPaymentDrafts((drafts) => ({ ...drafts, [customerId]: amount }))}
      onPayCustomerDebt={payCustomerDebt}
      onAccountPaymentDraftChange={(accountId, amount) => setAccountPaymentDrafts((drafts) => ({ ...drafts, [accountId]: amount }))}
      onPayUnlinkedAccount={payUnlinkedAccount}
      onLinkCustomerDraftChange={(accountId, customerId) => setLinkCustomerDrafts((drafts) => ({ ...drafts, [accountId]: customerId }))}
      onLinkToCustomer={linkToCustomer}
      onCreateCustomerFromAccount={createCustomerFromAccount}
    />
  );
}

function toCustomerDebtRows(entries: readonly CustomerDebtEntry[], customers: readonly Customer[]): PendingCustomerDebtRow[] {
  return customers
    .map((customer) => ({
      customerId: customer.id,
      displayName: customer.displayName,
      balanceCents: customerDebtBalance({ entries, customerId: customer.id }),
      lastDebtAt: entries.filter((entry) => entry.customerId === customer.id).at(-1)?.createdAt ?? customer.updatedAt,
    }))
    .filter((row) => row.balanceCents > 0);
}

async function toUnlinkedRows(
  accounts: readonly PersonalAccount[],
  orders: readonly Order[],
  accountsPort: ReturnType<typeof usePersonalAccounts>,
  paymentsPort: ReturnType<typeof usePayments>,
): Promise<UnlinkedPendingAccountRow[]> {
  const rows = await Promise.all(accounts.map(async (account) => {
    const order = orders.find((candidate) => candidate.id === account.orderId);
    if (!order || account.owner.kind !== "free_name") return null;
    const allocations = await accountsPort.listAllocationsByOrder(order.id);
    const payments = await paymentsPort.listByTarget({ kind: "personal_account", accountId: account.id });
    const balance = accountBalance({
      accountId: account.id,
      lineItems: order.lineItems,
      allocations,
      payments: payments.map((payment) => ({ accountId: account.id, amountCents: payment.amountCents })),
    });
    if (balance.remainingCents <= 0) return null;
    return {
      accountId: account.id,
      freeName: account.owner.freeName,
      orderId: order.id,
      tableId: order.tableId,
      remainingCents: balance.remainingCents,
      createdAt: account.createdAt,
    };
  }));
  return rows.filter((row): row is UnlinkedPendingAccountRow => row !== null);
}

async function getAccountContext(
  accountId: string,
  accountsPort: ReturnType<typeof usePersonalAccounts>,
  ordersPort: ReturnType<typeof useOrders>,
  paymentsPort: ReturnType<typeof usePayments>,
): Promise<AccountContext> {
  const account = await accountsPort.findById(accountId);
  const orders = await ordersPort.listAll();
  const order = account ? orders.find((candidate) => candidate.id === account.orderId) : null;
  if (!account || !order) throw new Error(`Pending account ${accountId} could not be found`);
  const allocations = await accountsPort.listAllocationsByOrder(order.id);
  const payments = await paymentsPort.listByTarget({ kind: "personal_account", accountId });
  const balance = accountBalance({
    accountId,
    lineItems: order.lineItems,
    allocations,
    payments: payments.map((payment) => ({ accountId, amountCents: payment.amountCents })),
  });
  return { account, order, allocations, remainingCents: balance.remainingCents };
}

function positiveDraft(value: string | undefined): number {
  const amount = Number(value ?? 0);
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("El monto de pago debe ser un número positivo de centavos");
  return amount;
}
