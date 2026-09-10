import { createUuid } from "@kutana/shared/platform/uuid.js";
import { useCallback, useEffect, useState } from "react";
import { createCustomerDebtEntry } from "@kutana/shared/billing/model/customer-debt-ledger.js";
import { closeOrderWithPersonalAccounts } from "@kutana/shared/billing/model/order-closure.js";
import {
  accountBalance,
  addAccountLineAllocation,
  createAccountLineAllocation,
  createPersonalAccount,
  derivePersonalAccountStatus,
  type AccountLineAllocation,
  type AccountPaymentAmount,
  type Customer,
  type PersonalAccount,
} from "@kutana/shared/billing/model/personal-account.js";
import { ConflictError } from "@kutana/shared/errors/conflict-error.js";
import type { Payment } from "@kutana/shared/payments/model/payment.js";
import type { Order } from "@kutana/shared/ordering/model/order.js";
import type { Table } from "@kutana/shared/ordering/model/table.js";
import {
  useCustomerDebts,
  useCustomers,
  useOrderEvents,
  useOrders,
  usePaymentMethods,
  usePayments,
  usePaymentClosure,
  usePersonalAccounts,
  useTables,
} from "../../../composition/PortsProvider.js";
import { ConflictBanner } from "../components/ConflictBanner.js";
import {
  SplitBillView,
  type AccountAllocationDraft,
  type AccountAssignmentAccount,
  type AccountAssignmentLine,
} from "../components/SplitBillView.js";
import styles from "./SplitBillContainer.module.css";

export interface SplitBillContainerProps {
  readonly tableId: string;
  readonly onPayAccount?: (accountId: string) => void;
}

interface AccountPaymentCache {
  readonly accountId: string;
  readonly paidCents: number;
}

function ownerLabel(account: PersonalAccount, customers: readonly Customer[]): string {
  const { owner } = account;
  if (owner.kind === "free_name") return owner.freeName;
  return (
    customers.find((customer) => customer.id === owner.customerId)?.displayName ?? owner.customerId
  );
}

function toLines(
  order: Order,
  allocations: readonly AccountLineAllocation[],
): AccountAssignmentLine[] {
  return order.lineItems.map((line) => {
    const assigned = allocations
      .filter((allocation) => allocation.lineItemId === line.id)
      .reduce((sum, allocation) => sum + allocation.quantity, 0);
    return {
      id: line.id,
      name: line.nameSnapshot,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      totalCents: line.totalCents,
      unassignedQuantity: line.quantity - assigned,
    };
  });
}

function toAccountPayments(payments: readonly AccountPaymentCache[]): AccountPaymentAmount[] {
  return payments.map((payment) => ({
    accountId: payment.accountId,
    amountCents: payment.paidCents,
  }));
}

export function SplitBillContainer({
  tableId,
  onPayAccount,
}: SplitBillContainerProps): JSX.Element | null {
  const tables = useTables();
  const orders = useOrders();
  const customersPort = useCustomers();
  const accountsPort = usePersonalAccounts();
  const paymentsPort = usePayments();
  const paymentClosure = usePaymentClosure();
  const debtsPort = useCustomerDebts();
  const methods = usePaymentMethods();
  const events = useOrderEvents();

  const [table, setTable] = useState<Table | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<PersonalAccount[]>([]);
  const [allocations, setAllocations] = useState<AccountLineAllocation[]>([]);
  const [payments, setPayments] = useState<AccountPaymentCache[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [freeName, setFreeName] = useState("");
  const [allocationDraft, setAllocationDraft] = useState<AccountAllocationDraft>({
    accountId: "",
    lineItemId: "",
    quantity: "1",
  });
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const [foundTable, foundOrder, allCustomers] = await Promise.all([
      tables.findById(tableId),
      orders.findByTable(tableId),
      customersPort.listAll(),
    ]);
    if (!foundTable || !foundOrder) return;

    const [orderAccounts, orderAllocations] = await Promise.all([
      accountsPort.listByOrder(foundOrder.id),
      accountsPort.listAllocationsByOrder(foundOrder.id),
    ]);
    const accountPayments = await Promise.all(
      orderAccounts.map(async (account) => ({
        accountId: account.id,
        paidCents: (
          await paymentsPort.listByTarget({ kind: "personal_account", accountId: account.id })
        ).reduce((sum, payment) => sum + payment.amountCents, 0),
      })),
    );

    setTable(foundTable);
    setOrder(foundOrder);
    setCustomers(allCustomers);
    setAccounts(orderAccounts);
    setAllocations(orderAllocations);
    setPayments(accountPayments);
  }, [accountsPort, customersPort, orders, paymentsPort, tableId, tables]);

  useEffect(() => {
    void load();
  }, [load]);

  const runMutation = useCallback(
    async (mutation: () => Promise<void>): Promise<void> => {
      setBusy(true);
      try {
        await mutation();
        setConflictMessage(null);
        await load();
      } catch (error) {
        if (error instanceof ConflictError) {
          await load();
          setConflictMessage(
            "This account assignment changed on another device. We've refreshed it below — please review and try again.",
          );
        } else {
          throw error;
        }
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  if (!table || !order) return null;

  const accountRows: AccountAssignmentAccount[] = accounts.map((account) => {
    const balance = accountBalance({
      accountId: account.id,
      lineItems: order.lineItems,
      allocations,
      payments: toAccountPayments(payments),
    });
    return {
      ...balance,
      id: account.id,
      owner: account.owner,
      status: account.status,
      ownerLabel: ownerLabel(account, customers),
    };
  });

  const createCustomerAccount = (): void => {
    void runMutation(async () => {
      const account = createPersonalAccount({ orderId: order.id, customerId: selectedCustomerId });
      await accountsPort.save(account, allocations, 0);
      setSelectedCustomerId("");
    });
  };

  const createFreeNameAccount = (): void => {
    void runMutation(async () => {
      const account = createPersonalAccount({ orderId: order.id, freeName });
      await accountsPort.save(account, allocations, 0);
      setFreeName("");
    });
  };

  const assignQuantity = (draft = allocationDraft): void => {
    void runMutation(async () => {
      const quantity = Number(draft.quantity);
      const next = createAccountLineAllocation({
        accountId: draft.accountId,
        lineItemId: draft.lineItemId,
        quantity,
      });
      const result = addAccountLineAllocation({ allocations, lineItems: order.lineItems, next });
      const account = accounts.find((candidate) => candidate.id === draft.accountId);
      if (!account) return;
      await accountsPort.save(account, result.allocations, account.version);
      setAllocationDraft({ ...draft, quantity: "1" });
    });
  };

  const payAccount = (accountId: string): void => {
    if (onPayAccount) {
      onPayAccount(accountId);
      return;
    }

    void runMutation(async () => {
      const account = accounts.find((candidate) => candidate.id === accountId);
      const row = accountRows.find((candidate) => candidate.id === accountId);
      const method = methods.find((candidate) => candidate.active) ?? methods[0];
      if (!account || !row || row.remainingCents <= 0 || !method) return;
      const payment: Payment = {
        id: createUuid(),
        target: { kind: "personal_account", accountId },
        methodCode: method.code,
        amountCents: row.remainingCents,
        tenderedCents: method.requiresTendered ? row.remainingCents : null,
        changeCents: method.requiresTendered ? 0 : null,
        recordedAt: new Date().toISOString(),
      };
      await paymentsPort.record(payment);
      await accountsPort.save(
        { ...account, status: "paid", closedAt: new Date().toISOString() },
        allocations,
        account.version,
      );
    });
  };

  const markPending = (accountId: string): void => {
    void runMutation(async () => {
      const account = accounts.find((candidate) => candidate.id === accountId);
      const row = accountRows.find((candidate) => candidate.id === accountId);
      if (!account || !row || row.remainingCents <= 0) return;
      const saved = await accountsPort.save(
        { ...account, status: "pending", closedAt: new Date().toISOString() },
        allocations,
        account.version,
      );
      if (saved.owner.kind === "customer") {
        await debtsPort.record(
          createCustomerDebtEntry({
            customerId: saved.owner.customerId,
            direction: "debit",
            kind: "pending_account",
            amountCents: row.remainingCents,
            accountId: saved.id,
          }),
        );
      }
    });
  };

  const deleteAccount = (accountId: string): void => {
    void runMutation(async () => {
      const account = accounts.find((candidate) => candidate.id === accountId);
      const row = accountRows.find((candidate) => candidate.id === accountId);
      if (
        !account ||
        !row ||
        row.paidCents > 0 ||
        account.status === "pending" ||
        account.status === "paid"
      )
        return;
      await accountsPort.delete(account.id, account.version);
      if (allocationDraft.accountId === account.id) {
        setAllocationDraft({ ...allocationDraft, accountId: "" });
      }
    });
  };

  const attemptClose = (): void => {
    void runMutation(async () => {
      const effectiveAccounts = accountRows.map((row) => {
        const account = accounts.find((candidate) => candidate.id === row.id)!;
        return {
          ...account,
          status: derivePersonalAccountStatus({
            totalCents: row.totalCents,
            paidCents: row.paidCents,
            isPending: account.status === "pending",
          }),
        };
      });
      const result = closeOrderWithPersonalAccounts({
        order,
        accounts: effectiveAccounts,
        allocations,
        payments: toAccountPayments(payments),
      });
      if (result.kind === "review_required") {
        setReviewMessage(
          `Revisión requerida: ${result.unresolvedLineItems.length} producto(s) tienen cantidades sin asignar o asignadas de más, y ${result.blockingAccounts.length} cuenta(s) todavía necesitan cobro o resolución pendiente.`,
        );
        await orders.save(result.order, order.version);
      } else {
        setReviewMessage(
          result.pendingAccountIds.length > 0
            ? "Mesa cerrada con deuda personal pendiente."
            : "Mesa cerrada con todo pagado.",
        );
        const sale = await paymentClosure.closeOrder(order.id);
        events.publish({
          type: "order.closed",
          orderId: sale.orderId,
          tableId,
          version: result.order.version,
          at: new Date().toISOString(),
          payload: result.order,
        });
      }
    });
  };

  return (
    <div className={styles.screen}>
      {conflictMessage ? (
        <ConflictBanner message={conflictMessage} onDismiss={() => setConflictMessage(null)} />
      ) : null}
      <SplitBillView
        tableLabel={table.label}
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        freeName={freeName}
        lines={toLines(order, allocations)}
        accounts={accountRows}
        allocationDraft={allocationDraft}
        reviewMessage={reviewMessage}
        disabled={busy || conflictMessage !== null}
        onSelectCustomer={setSelectedCustomerId}
        onFreeNameChange={setFreeName}
        onCreateCustomerAccount={createCustomerAccount}
        onCreateFreeNameAccount={createFreeNameAccount}
        onAllocationDraftChange={setAllocationDraft}
        onAssignQuantity={assignQuantity}
        onPayAccount={payAccount}
        onMarkPending={markPending}
        onDeleteAccount={deleteAccount}
        onAttemptClose={attemptClose}
      />
    </div>
  );
}
