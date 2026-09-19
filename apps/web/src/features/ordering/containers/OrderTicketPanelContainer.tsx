import { useEffect, useState } from "react";
import { ConflictError } from "@kutana/shared/errors/conflict-error.js";
import type {
  Order,
  OrderStatus as DomainOrderStatus,
} from "@kutana/shared/ordering/model/order.js";
import type { Table } from "@kutana/shared/ordering/model/table.js";
import type { AccountLineAllocation, Customer, PersonalAccount } from "@kutana/shared/billing/model/personal-account.js";
import { removeLineItem } from "@kutana/shared/ordering/services/line-item-service.js";
import { useCustomers, useOrderEvents, useOrders, usePayments, usePersonalAccounts, useTables } from "../../../composition/PortsProvider.js";
import { OrderTicketPanel, type OrderPaymentDetailLine, type OrderTicketPanelLine } from "../components/OrderTicketPanel.js";
import type { OrderStatus } from "../../../design-system/molecules/StatusPill.js";

const STATUS_MAP: Record<DomainOrderStatus, OrderStatus> = {
  active: "active",
  needs_check: "needs-check",
  in_review: "in-review",
  paid: "paid",
  closed_with_pending: "closed-with-pending",
};

type LineItem = Order["lineItems"][number];

function lineGroupKey(line: LineItem): string {
  return [
    line.productId,
    line.nameSnapshot,
    line.unitPriceCents,
    line.pourSizeMl ?? "",
    line.taxRateBp,
    line.isAdjustment ? "adjustment" : "sale",
  ].join("|");
}

function aggregateLines(
  lines: readonly LineItem[],
  paidLineItemIds: ReadonlySet<string> = new Set(),
): OrderTicketPanelLine[] {
  const groups = new Map<string, OrderTicketPanelLine>();

  for (const line of lines) {
    const key = lineGroupKey(line);
    const existing = groups.get(key);

    if (existing) {
      groups.set(key, {
        ...existing,
        id: line.id,
        quantity: existing.quantity + line.quantity,
        totalCents: existing.totalCents + line.totalCents,
        paymentStatus: existing.paymentStatus === "paid" && paidLineItemIds.has(line.id) ? "paid" : undefined,
      });
      continue;
    }

    groups.set(key, {
      id: line.id,
      name: line.nameSnapshot,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      totalCents: line.totalCents,
      pourSizeMl: line.pourSizeMl as OrderTicketPanelLine["pourSizeMl"],
      isAdjustment: line.isAdjustment,
      paymentStatus: paidLineItemIds.has(line.id) ? "paid" : undefined,
    });
  }

  return [...groups.values()];
}

export interface OrderTicketPanelContainerProps {
  readonly tableId: string;
}

/**
 * Shows one table's order summary before personal-account assignment and
 * subscribes to `OrderEvents` so it stays live if the order changes on another
 * device
 * while this panel is open.
 */
export function OrderTicketPanelContainer({
  tableId,
}: OrderTicketPanelContainerProps): JSX.Element | null {
  const tables = useTables();
  const orders = useOrders();
  const personalAccounts = usePersonalAccounts();
  const customersPort = useCustomers();
  const payments = usePayments();
  const events = useOrderEvents();

  const [table, setTable] = useState<Table | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [accounts, setAccounts] = useState<PersonalAccount[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accountAllocations, setAccountAllocations] = useState<AccountLineAllocation[]>([]);
  const [accountPaidById, setAccountPaidById] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      const foundTable = await tables.findById(tableId);
      if (cancelled) return;
      setTable(foundTable);
      const foundOrder = await orders.findByTable(tableId);
      if (cancelled) return;
      setOrder(foundOrder);
      window.setTimeout(() => window.dispatchEvent(new CustomEvent("kutana.order.updated", {
        detail: { orderCount: foundOrder?.lineItems.reduce((sum, line) => sum + line.quantity, 0) ?? 0 },
      })), 0);
      if (!foundOrder) {
        setAccounts([]);
        setAccountAllocations([]);
        return;
      }
      const [foundAccounts, foundAllocations, allCustomers] = await Promise.all([
        personalAccounts.listByOrder(foundOrder.id),
        personalAccounts.listAllocationsByOrder(foundOrder.id),
        customersPort.listAll(),
      ]);
      const paymentsByAccount = await Promise.all(
        foundAccounts.map((account) =>
          payments.listByTarget({ kind: "personal_account", accountId: account.id }),
        ),
      );
      if (cancelled) return;
      setAccounts(foundAccounts);
      setCustomers(allCustomers);
      setAccountAllocations(foundAllocations);
      setAccountPaidById(Object.fromEntries(foundAccounts.map((account, index) => [
        account.id,
        paymentsByAccount[index]?.reduce((sum, payment) => sum + payment.amountCents, 0) ?? 0,
      ])));

    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [tableId, tables, orders, personalAccounts, customersPort, payments]);

  useEffect(() => {
    if (!order) return;
    return events.subscribe(order.id, (event) => {
      const nextOrder = event.payload.status === "paid" || event.payload.status === "closed_with_pending"
        ? null
        : event.payload;
      setOrder(nextOrder);
      window.dispatchEvent(new CustomEvent("kutana.order.updated", {
        detail: { orderCount: nextOrder?.lineItems.reduce((sum, line) => sum + line.quantity, 0) ?? 0 },
      }));
    });
  }, [order?.id, events]);

  async function handleRemoveLine(lineId: string): Promise<void> {
    const current = await orders.findByTable(tableId);
    if (!current) {
      return;
    }

    const next = removeLineItem(current, lineId);
    try {
      const shouldCloseEmptyOrder = next.lineItems.length === 0;
      const orderToSave: Order = shouldCloseEmptyOrder
        ? { ...next, status: "paid", closedAt: new Date().toISOString() }
        : next;
      const saved = await orders.save(orderToSave, current.version);
      if (shouldCloseEmptyOrder) {
        const currentTable = await tables.findById(tableId);
        if (currentTable) {
          await tables.save(
            { ...currentTable, status: "free", currentOrderId: null },
            currentTable.version,
          );
        }
        setOrder(null);
      } else {
        setOrder(saved);
      }
      events.publish({
        type: shouldCloseEmptyOrder ? "order.closed" : "order.updated",
        orderId: saved.id,
        tableId,
        version: saved.version,
        at: new Date().toISOString(),
        payload: saved,
      });
    } catch (error) {
      if (error instanceof ConflictError) {
        setOrder((error.currentSnapshot as Order | null) ?? null);
      } else {
        throw error;
      }
    }
  }

  if (!table || !order) return null;

  const accountOwnerLabel = (account: PersonalAccount): string => {
    if (account.owner.kind === "free_name") return account.owner.freeName;
    const customerId = account.owner.customerId;
    return customers.find((customer) => customer.id === customerId)?.displayName ?? customerId;
  };
  const accountPaidCents = Object.values(accountPaidById).reduce((sum, amount) => sum + amount, 0);
  const paidAccountIds = new Set(accounts.filter((account) => account.status === "paid").map((account) => account.id));
  const paidLineItemIds = new Set(
    order.lineItems
      .filter((line) => {
        const paidQuantity = accountAllocations
          .filter((allocation) => allocation.lineItemId === line.id && paidAccountIds.has(allocation.accountId))
          .reduce((sum, allocation) => sum + allocation.quantity, 0);
        return paidQuantity >= line.quantity;
      })
      .map((line) => line.id),
  );
  const lines = aggregateLines(order.lineItems, paidLineItemIds);
  const paymentDetails: OrderPaymentDetailLine[] = order.lineItems.map((line) => {
    const lineAllocations = accountAllocations.filter((allocation) => allocation.lineItemId === line.id);
    const payerIds = [...new Set(lineAllocations.map((allocation) => allocation.accountId))];
    const payerLabels = payerIds.map((accountId) => {
      const account = accounts.find((candidate) => candidate.id === accountId);
      return account ? accountOwnerLabel(account) : accountId;
    });
    const hasPaidLine = paidLineItemIds.has(line.id);
    const hasPartialPayment = payerIds.some((accountId) => (accountPaidById[accountId] ?? 0) > 0);
    return {
      id: line.id,
      name: line.nameSnapshot,
      quantity: line.quantity,
      payerLabels,
      status: hasPaidLine ? "paid" : hasPartialPayment ? "partial" : "pending",
    };
  });
  const subtotalCents = order.lineItems.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0,
  );
  // Tax is the SUM of each line item's persisted at-sale-time taxCents —
  // never recomputed from the current catalog rate (spec: "Tax Persisted
  // at Sale Time").
  const taxCents = order.lineItems.reduce((sum, line) => sum + line.taxCents, 0);
  const totalCents = Math.max(
    0,
    order.lineItems.reduce((sum, line) => sum + line.totalCents, 0) - accountPaidCents,
  );

  return (
    <OrderTicketPanel
      tableLabel={table.label}
      status={STATUS_MAP[order.status]}
      lines={lines}
      subtotalCents={subtotalCents}
      taxCents={taxCents}
      totalCents={totalCents}
      paidCents={accountPaidCents}
      paidLineCount={paymentDetails.filter((line) => line.status === "paid").length}
      pendingLineCount={paymentDetails.filter((line) => line.status !== "paid").length}
      paymentDetails={paymentDetails}
      onRemoveLine={
        order.status === "paid" || order.status === "closed_with_pending"
          ? undefined
          : (lineId) => void handleRemoveLine(lineId)
      }
    />
  );
}
