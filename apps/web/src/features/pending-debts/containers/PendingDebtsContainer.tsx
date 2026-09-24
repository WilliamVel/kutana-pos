import { createUuid } from "@kutana/shared/platform/uuid.js";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const [customerPaymentErrors, setCustomerPaymentErrors] = useState<Record<string, string>>({});
  const [accountPaymentErrors, setAccountPaymentErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const loadGeneration = useRef(0);
  const [customerListQuery, setCustomerListQuery] = useState({ page: 0, pageSize: 20, search: "", sort: "activity" as "activity" | "balance" });
  const [globalTotals, setGlobalTotals] = useState<{ totalPendingCents: number; identifiedTotalCents: number; unlinkedTotalCents: number; totalRows: number } | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const generation = ++loadGeneration.current;
    setLoading(true);
    const [allCustomers, orders, pendingAccounts] = await Promise.all([
      customersPort.listAll(),
      ordersPort.listAll(),
      accountsPort.listPendingFreeName(),
    ]);
    if (generation !== loadGeneration.current) return;
    setCustomers(allCustomers);
    const page = debtsPort.listPendingPage
      ? await debtsPort.listPendingPage(customerListQuery)
      : null;
    if (page) {
      setCustomerDebts(page.rows.map((row) => ({ ...row })));
      setGlobalTotals({ totalPendingCents: page.totalPendingCents, identifiedTotalCents: page.identifiedTotalCents, unlinkedTotalCents: page.unlinkedTotalCents, totalRows: page.totalRows });
    } else {
      const entries = await debtsPort.listAll();
      const rows = toCustomerDebtRows(entries, allCustomers);
      setCustomerDebts(rows);
      const identifiedTotalCents = rows.reduce((sum, row) => sum + row.balanceCents, 0);
      setGlobalTotals((totals) => ({ ...(totals ?? { unlinkedTotalCents: 0 }), totalPendingCents: identifiedTotalCents, identifiedTotalCents, totalRows: rows.length }));
    }
    const unlinkedRows = await toUnlinkedRows(pendingAccounts, orders, accountsPort, paymentsPort);
    if (generation !== loadGeneration.current) return;
    setUnlinkedAccounts(unlinkedRows);
    setGlobalTotals((totals) => totals ? ({ ...totals, unlinkedTotalCents: page?.unlinkedTotalCents ?? unlinkedRows.reduce((sum, row) => sum + row.remainingCents, 0) }) : totals);
    setLoading(false);
  }, [accountsPort, customersPort, customerListQuery, debtsPort, ordersPort, paymentsPort]);

  useEffect(() => {
    void load();
  }, [load]);

  const onCustomerListQueryChange = useCallback((query: { search: string; sort: "activity" | "balance"; page: number }): void => {
    setCustomerListQuery((current) => ({ ...current, ...query }));
  }, []);

  const runMutation = useCallback(async (mutation: () => Promise<string>): Promise<void> => {
    setBusy(true);
    try {
      const nextMessage = await mutation();
      setMessage(nextMessage);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar el pago. Revisa la conexión e inténtalo de nuevo.");
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
      const debt = customerDebts.find((row) => row.customerId === customerId);
      const amountCents = validateDraft(customerPaymentDrafts[customerId], debt?.balanceCents);
      if (!debt) throw new Error("La deuda ya no está disponible. Actualiza la lista.");
      const payment = await recordPayment({ kind: "customer_debt", customerId }, amountCents);
      await debtsPort.record(createCustomerDebtEntry({
        customerId,
        direction: "credit",
        kind: "payment",
        amountCents,
        paymentId: payment.id,
      }));
      setCustomerPaymentDrafts((drafts) => ({ ...drafts, [customerId]: "" }));
      setCustomerPaymentErrors((errors) => ({ ...errors, [customerId]: "" }));
      return "Pago de deuda registrado sin reabrir la mesa original.";
    });
  };

  const payUnlinkedAccount = (accountId: string): void => {
    void runMutation(async () => {
      const row = unlinkedAccounts.find((candidate) => candidate.accountId === accountId);
      const amountCents = validateDraft(accountPaymentDrafts[accountId], row?.remainingCents);
      const context = await getAccountContext(accountId, accountsPort, ordersPort, paymentsPort);
      await recordPayment({ kind: "personal_account", accountId }, Math.min(amountCents, context.remainingCents));
      if (amountCents >= context.remainingCents) {
        await accountsPort.save({ ...context.account, status: "paid", closedAt: new Date().toISOString() }, context.allocations, context.account.version);
      }
      setAccountPaymentDrafts((drafts) => ({ ...drafts, [accountId]: "" }));
      setAccountPaymentErrors((errors) => ({ ...errors, [accountId]: "" }));
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
      customerPaymentErrors={customerPaymentErrors}
      accountPaymentErrors={accountPaymentErrors}
      loading={loading}
      globalTotals={globalTotals}
      serverPagination={debtsPort.listPendingPage ? { page: customerListQuery.page, pageSize: customerListQuery.pageSize, totalRows: globalTotals?.totalRows ?? 0 } : undefined}
      onCustomerListQueryChange={onCustomerListQueryChange}
      onCustomerPaymentDraftChange={(customerId, amount) => {
        setCustomerPaymentDrafts((drafts) => ({ ...drafts, [customerId]: amount }));
        setCustomerPaymentErrors((errors) => ({ ...errors, [customerId]: validateDraftMessage(amount, customerDebts.find((row) => row.customerId === customerId)?.balanceCents) }));
      }}
      onPayCustomerDebt={payCustomerDebt}
      onAccountPaymentDraftChange={(accountId, amount) => {
        setAccountPaymentDrafts((drafts) => ({ ...drafts, [accountId]: amount }));
        setAccountPaymentErrors((errors) => ({ ...errors, [accountId]: validateDraftMessage(amount, unlinkedAccounts.find((row) => row.accountId === accountId)?.remainingCents) }));
      }}
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
      debitCents: entries.filter((entry) => entry.customerId === customer.id && entry.direction === "debit").reduce((sum, entry) => sum + entry.amountCents, 0),
      paidCents: entries.filter((entry) => entry.customerId === customer.id && entry.direction === "credit").reduce((sum, entry) => sum + entry.amountCents, 0),
      sourceCount: new Set(entries.filter((entry) => entry.customerId === customer.id && entry.accountId).map((entry) => entry.accountId)).size,
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
      originalCents: balance.totalCents,
      paidCents: balance.paidCents,
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

function parseDollarsToCents(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

function validateDraftMessage(value: string | undefined, balanceCents: number | undefined): string {
  const amountCents = parseDollarsToCents(value);
  if (amountCents === null) return !value?.trim() ? "Ingresa un importe en USD." : "Usa un importe válido con hasta dos decimales, por ejemplo 3,36.";
  if (amountCents <= 0) return "El importe debe ser mayor que cero.";
  if (balanceCents !== undefined && amountCents > balanceCents) return `El importe no puede superar el saldo de $${(balanceCents / 100).toFixed(2)}.`;
  return "";
}

function validateDraft(value: string | undefined, balanceCents: number | undefined): number {
  const error = validateDraftMessage(value, balanceCents);
  if (error) throw new Error(error);
  return parseDollarsToCents(value)!;
}
