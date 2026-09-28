import { createUuid } from "@kutana/shared/platform/uuid.js";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  useCategories,
  useCustomerDebts,
  useCustomers,
  useOrderEvents,
  useOrders,
  usePaymentMethods,
  useProducts,
  usePayments,
  usePaymentClosure,
  usePersonalAccounts,
  useTables,
  useTickets,
} from "../../../composition/PortsProvider.js";
import { ConflictBanner } from "../components/ConflictBanner.js";
import {
  SplitBillView,
  type AccountAllocationDraft,
  type AccountAssignmentAccount,
  type AccountAssignmentLine,
  type AssignedAccountLine,
  type AccountPaymentDetail,
} from "../components/SplitBillView.js";
import { orderTicketLines, type VisualProductMetadata } from "../../ordering/visual-ordering.js";
import styles from "./SplitBillContainer.module.css";

export interface SplitBillContainerProps {
  readonly tableId: string;
  readonly onPayAccount?: (accountId: string) => void;
  readonly onPayOrder?: () => void;
}

interface AccountPaymentCache {
  readonly accountId: string;
  readonly payments: readonly Payment[];
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
  metadataByProductId: ReadonlyMap<string, VisualProductMetadata>,
): AccountAssignmentLine[] {
  const grouped = new Map<string, AccountAssignmentLine>();

  for (const line of order.lineItems) {
    const key = [
      line.productId,
      line.nameSnapshot,
      line.unitPriceCents,
      line.pourSizeMl ?? "",
      line.taxRateBp,
      line.isAdjustment,
    ].join("|");
    const assigned = allocations
      .filter((allocation) => allocation.lineItemId === line.id)
      .reduce((sum, allocation) => sum + allocation.quantity, 0);
    const existing = grouped.get(key);
    if (existing) {
      grouped.set(key, {
        ...existing,
        lineItemIds: [...existing.lineItemIds, line.id],
        presentation: line.pourSizeMl ? `${line.pourSizeMl} ml` : "Unidad",
        productId: line.productId,
        pourSizeMl: line.pourSizeMl,
        isAdjustment: line.isAdjustment,
        categoryName:
          existing.categoryName ?? metadataByProductId.get(line.productId)?.categoryName,
        stockKind: existing.stockKind ?? metadataByProductId.get(line.productId)?.stockKind,
        quantity: existing.quantity + line.quantity,
        totalCents: existing.totalCents + line.totalCents,
        unassignedQuantity: existing.unassignedQuantity + line.quantity - assigned,
      });
    } else {
      grouped.set(key, {
        id: line.id,
        lineItemIds: [line.id],
        name: line.nameSnapshot,
        presentation: line.pourSizeMl ? `${line.pourSizeMl} ml` : "Unidad",
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        totalCents: line.totalCents,
        productId: line.productId,
        pourSizeMl: line.pourSizeMl,
        isAdjustment: line.isAdjustment,
        categoryName: metadataByProductId.get(line.productId)?.categoryName,
        stockKind: metadataByProductId.get(line.productId)?.stockKind,
        unassignedQuantity: line.quantity - assigned,
      });
    }
  }

  return [...grouped.values()];
}

function toAccountPayments(payments: readonly AccountPaymentCache[]): AccountPaymentAmount[] {
  return payments.flatMap((entry) =>
    entry.payments.map((payment) => ({
      accountId: entry.accountId,
      amountCents: payment.amountCents,
    })),
  );
}

export function SplitBillContainer({
  tableId,
  onPayAccount,
  onPayOrder,
}: SplitBillContainerProps): JSX.Element | null {
  const tables = useTables();
  const tickets = useTickets();
  const categoriesPort = useCategories();
  const productsPort = useProducts();
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
  const [tablePayments, setTablePayments] = useState<Payment[]>([]);
  const [metadataByProductId, setMetadataByProductId] = useState<
    ReadonlyMap<string, VisualProductMetadata>
  >(new Map());
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

    const [orderAccounts, orderAllocations, orderTickets] = await Promise.all([
      accountsPort.listByOrder(foundOrder.id),
      accountsPort.listAllocationsByOrder(foundOrder.id),
      tickets.listByOrder(foundOrder.id),
    ]);
    const tablePayments = await Promise.all(
      orderTickets.map((ticket) => paymentsPort.listByTicket(ticket.id)),
    );
    const accountPayments = await Promise.all(
      orderAccounts.map(async (account) => ({
        accountId: account.id,
        payments: await paymentsPort.listByTarget({
          kind: "personal_account",
          accountId: account.id,
        }),
      })),
    );

    setTable(foundTable);
    setOrder(foundOrder);
    setCustomers(allCustomers);
    setAccounts(orderAccounts);
    setAllocations(orderAllocations);
    setPayments(accountPayments);
    setTablePayments(tablePayments.flat());
  }, [accountsPort, customersPort, orders, paymentsPort, tableId, tables, tickets]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    const loadCatalogMetadata = async (): Promise<void> => {
      try {
        const catalogCategories = await categoriesPort.listAll();
        const productsByCategory = await Promise.all(
          catalogCategories.map((category) =>
            productsPort.listByCategory(category.id, { includeInactive: true }),
          ),
        );
        if (cancelled) return;
        const metadata = new Map<string, VisualProductMetadata>();
        catalogCategories.forEach((category, index) => {
          for (const product of productsByCategory[index] ?? []) {
            metadata.set(product.id, {
              categoryName: category.name,
              stockKind: product.stockKind,
              pourSizeMl: product.pourSizeMl,
            });
          }
        });
        setMetadataByProductId(metadata);
      } catch {
        if (!cancelled) setMetadataByProductId(new Map());
      }
    };
    void loadCatalogMetadata();
    return () => {
      cancelled = true;
    };
  }, [categoriesPort, productsPort]);

  const runMutation = useCallback(
    async (mutation: () => Promise<void>): Promise<boolean> => {
      setBusy(true);
      try {
        await mutation();
        setConflictMessage(null);
        await load();
        return true;
      } catch (error) {
        if (error instanceof ConflictError) {
          await load();
          setConflictMessage(
            "This account assignment changed on another device. We've refreshed it below — please review and try again.",
          );
        } else {
          setConflictMessage(
            "No se pudo completar la operación. Revisa el estado de la cuenta e inténtalo de nuevo.",
          );
        }
        return false;
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const lines = useMemo(
    () => (order ? toLines(order, allocations, metadataByProductId) : []),
    [allocations, metadataByProductId, order],
  );
  const accountRows = useMemo<AccountAssignmentAccount[]>(() => {
    if (!order) return [];

    return accounts.map((account) => {
      const assignedLinesByProduct = new Map<string, AssignedAccountLine>();
      for (const allocation of allocations.filter(
        (candidate) => candidate.accountId === account.id,
      )) {
        const line = order.lineItems.find((candidate) => candidate.id === allocation.lineItemId);
        const name = line?.nameSnapshot ?? allocation.lineItemId;
        const key = [
          line?.productId ?? allocation.lineItemId,
          name,
          line?.unitPriceCents ?? "",
          line?.pourSizeMl ?? "",
          line?.taxRateBp ?? "",
          line?.isAdjustment ?? false,
        ].join("|");
        const existing = assignedLinesByProduct.get(key);
        assignedLinesByProduct.set(
          key,
          existing
            ? {
                ...existing,
                allocationIds: [...existing.allocationIds, allocation.id],
                quantity: existing.quantity + allocation.quantity,
                totalCents:
                  (existing.totalCents ?? 0) +
                  Math.round(
                    ((line?.totalCents ?? 0) / (line?.quantity ?? 1)) * allocation.quantity,
                  ),
              }
            : {
                allocationIds: [allocation.id],
                productId: line?.productId,
                pourSizeMl: line?.pourSizeMl ?? null,
                isAdjustment: line?.isAdjustment ?? false,
                categoryName: line?.productId
                  ? metadataByProductId.get(line.productId)?.categoryName
                  : undefined,
                stockKind: line?.productId
                  ? metadataByProductId.get(line.productId)?.stockKind
                  : undefined,
                name,
                presentation: line?.pourSizeMl ? `${line.pourSizeMl} ml` : "Unidad",
                quantity: allocation.quantity,
                unitPriceCents: line?.unitPriceCents ?? 0,
                taxRateBp: line?.taxRateBp ?? 0,
                totalCents: Math.round(
                  ((line?.totalCents ?? 0) / (line?.quantity ?? 1)) * allocation.quantity,
                ),
              },
        );
      }
      const assignedLines = orderTicketLines(
        [...assignedLinesByProduct.values()],
        metadataByProductId,
      );
      const balance = accountBalance({
        accountId: account.id,
        lineItems: order.lineItems,
        allocations,
        payments: toAccountPayments(payments),
      });
      const accountPayments =
        payments.find((entry) => entry.accountId === account.id)?.payments ?? [];
      const paymentDetails: AccountPaymentDetail[] = accountPayments.map((payment) => ({
        id: payment.id,
        amountCents: payment.amountCents,
        methodLabel:
          methods.find((method) => method.code === payment.methodCode)?.label ?? payment.methodCode,
        recordedAt: payment.recordedAt,
      }));
      return {
        ...balance,
        id: account.id,
        owner: account.owner,
        status: account.status,
        ownerLabel: ownerLabel(account, customers),
        assignedLines,
        payments: paymentDetails,
      };
    });
  }, [accounts, allocations, customers, metadataByProductId, methods, order, payments]);

  if (!table || !order) return null;

  const tableTotalCents = order.lineItems.reduce((sum, line) => sum + line.totalCents, 0);
  const tablePaidCents =
    accountRows.reduce((sum, account) => sum + account.paidCents, 0) +
    tablePayments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const tableRemainingCents = Math.max(0, tableTotalCents - tablePaidCents);

  const createCustomerAccount = (): void => {
    void runMutation(async () => {
      const account = createPersonalAccount({ orderId: order.id, customerId: selectedCustomerId });
      await accountsPort.save(account, allocations, 0);
      setAllocationDraft((draft) => ({ ...draft, accountId: account.id }));
      setSelectedCustomerId("");
    });
  };

  const createFreeNameAccount = (): void => {
    void runMutation(async () => {
      const account = createPersonalAccount({ orderId: order.id, freeName });
      await accountsPort.save(account, allocations, 0);
      setAllocationDraft((draft) => ({ ...draft, accountId: account.id }));
      setFreeName("");
    });
  };

  const assignQuantities = (drafts: readonly AccountAllocationDraft[]): Promise<boolean> =>
    runMutation(async () => {
      const accountId = drafts[0]?.accountId;
      if (!accountId) return;
      const account = accounts.find((candidate) => candidate.id === accountId);
      if (!account || drafts.some((draft) => draft.accountId !== accountId)) return;

      let nextAllocations = [...allocations];
      for (const draft of drafts) {
        const quantity = Number(draft.quantity);
        const groupedLine = toLines(order, nextAllocations, metadataByProductId).find(
          (line) => line.id === draft.lineItemId,
        );
        if (!groupedLine || !Number.isFinite(quantity) || quantity <= 0) return;

        let remainingToAssign = quantity;
        for (const lineItemId of groupedLine.lineItemIds) {
          if (remainingToAssign <= 0) break;
          const lineItem = order.lineItems.find((line) => line.id === lineItemId);
          if (!lineItem) continue;
          const alreadyAssigned = nextAllocations
            .filter((allocation) => allocation.lineItemId === lineItemId)
            .reduce((sum, allocation) => sum + allocation.quantity, 0);
          const available = Math.max(0, lineItem.quantity - alreadyAssigned);
          const quantityForLine = Math.min(available, remainingToAssign);
          if (quantityForLine <= 0) continue;
          const next = createAccountLineAllocation({
            accountId,
            lineItemId,
            quantity: quantityForLine,
          });
          nextAllocations = addAccountLineAllocation({
            allocations: nextAllocations,
            lineItems: order.lineItems,
            next,
          }).allocations;
          remainingToAssign -= quantityForLine;
        }
        if (remainingToAssign > 0) return;
      }

      setAllocations(nextAllocations);
      try {
        await accountsPort.save(account, nextAllocations, account.version);
      } catch (error) {
        setAllocations(allocations);
        throw error;
      }
    });

  const assignQuantity = (draft = allocationDraft): Promise<boolean> => {
    const result = assignQuantities([draft]);
    setAllocationDraft({ ...draft, quantity: "1" });
    return result;
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

  const removeAllocation = (
    accountId: string,
    allocationIds: readonly string[],
    quantity?: number,
  ): Promise<boolean> =>
    runMutation(async () => {
      const account = accounts.find((candidate) => candidate.id === accountId);
      if (!account || account.status === "pending" || account.status === "paid") return;
      if (quantity === 1) {
        const target = [...allocations]
          .reverse()
          .find((allocation) => allocationIds.includes(allocation.id));
        if (!target) return;
        if (target.quantity > 1) {
          const nextAllocations = allocations.map((allocation) =>
            allocation.id === target.id
              ? { ...allocation, quantity: allocation.quantity - 1 }
              : allocation,
          );
          await accountsPort.save(account, nextAllocations, account.version);
          return;
        }
      }
      let version = account.version;
      const idsToRemove =
        quantity === 1
          ? [
              [...allocations].reverse().find((allocation) => allocationIds.includes(allocation.id))
                ?.id,
            ].filter((id): id is string => Boolean(id))
          : allocationIds;
      for (const allocationId of idsToRemove) {
        await accountsPort.removeAllocation(accountId, allocationId, version);
        version += 1;
      }
    });

  const deleteAccount = (accountId: string): Promise<boolean> =>
    runMutation(async () => {
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
        tableTotalCents={tableTotalCents}
        tablePaidCents={tablePaidCents}
        tableRemainingCents={tableRemainingCents}
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        freeName={freeName}
        lines={lines}
        accounts={accountRows}
        allocationDraft={allocationDraft}
        reviewMessage={reviewMessage}
        disabled={busy || conflictMessage !== null}
        processing={busy}
        onSelectCustomer={setSelectedCustomerId}
        onFreeNameChange={setFreeName}
        onCreateCustomerAccount={createCustomerAccount}
        onCreateFreeNameAccount={createFreeNameAccount}
        onAllocationDraftChange={setAllocationDraft}
        onAssignQuantity={assignQuantity}
        onAssignQuantities={assignQuantities}
        onPayAccount={payAccount}
        onMarkPending={markPending}
        onDeleteAccount={deleteAccount}
        onRemoveAllocation={removeAllocation}
        onAttemptClose={attemptClose}
        onPayOrder={onPayOrder}
      />
    </div>
  );
}
