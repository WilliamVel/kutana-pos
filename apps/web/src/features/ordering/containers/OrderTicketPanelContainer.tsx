import { useCallback, useEffect, useRef, useState } from "react";
import { ConflictError } from "@kutana/shared/errors/conflict-error.js";
import type {
  Order,
  OrderStatus as DomainOrderStatus,
} from "@kutana/shared/ordering/model/order.js";
import type { Table } from "@kutana/shared/ordering/model/table.js";
import type {
  AccountLineAllocation,
  Customer,
  PersonalAccount,
} from "@kutana/shared/billing/model/personal-account.js";
import { removeLineItem } from "@kutana/shared/ordering/services/line-item-service.js";
import {
  useCustomers,
  useOrderEvents,
  useOrders,
  usePayments,
  usePersonalAccounts,
  useTables,
} from "../../../composition/PortsProvider.js";
import {
  aggregateOrderLines,
  orderLineGroupingKey,
} from "../../../design-system/molecules/aggregate-order-lines.js";
import {
  OrderTicketPanel,
  type OrderPaymentDetailLine,
  type OrderTicketPanelLine,
} from "../components/OrderTicketPanel.js";
import type { OrderStatus } from "../../../design-system/molecules/StatusPill.js";

const STATUS_MAP: Record<DomainOrderStatus, OrderStatus> = {
  active: "active",
  needs_check: "needs-check",
  in_review: "in-review",
  paid: "paid",
  closed_with_pending: "closed-with-pending",
};

type LineItem = Order["lineItems"][number];

function aggregateLines(
  lines: readonly LineItem[],
  paidCentsByLineId: ReadonlyMap<string, number>,
): OrderTicketPanelLine[] {
  const source = lines.map((line) => ({ ...line, name: line.nameSnapshot }));
  return aggregateOrderLines(source).map((line) => {
    const members = source.filter((candidate) => orderLineGroupingKey(candidate) === orderLineGroupingKey(line));
    const paidCents = members.reduce((sum, member) => sum + (paidCentsByLineId.get(member.id) ?? 0), 0);
    const paymentStatus = paidCents >= line.totalCents && line.totalCents > 0
      ? "paid"
      : paidCents > 0 ? "partial" : undefined;
    return {
      id: line.id,
      name: line.name,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      totalCents: line.unitPriceCents * line.quantity,
      settlementTotalCents: line.totalCents,
      pourSizeMl: line.pourSizeMl as OrderTicketPanelLine["pourSizeMl"],
      isAdjustment: line.isAdjustment,
      paymentStatus,
      paidCents,
    };
  });
}

export interface OrderTicketPanelContainerProps {
  readonly tableId: string;
  readonly onLoadStateChange?: (state: "loading" | "ready" | "empty" | "error") => void;
}

/**
 * Shows one table's order summary before personal-account assignment and
 * subscribes to `OrderEvents` so it stays live if the order changes on another
 * device
 * while this panel is open.
 */
export function OrderTicketPanelContainer({
  tableId,
  onLoadStateChange,
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
  const [loadState, setLoadState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);

  const loadOrder = useCallback(
    async (orderOverride?: Order): Promise<void> => {
      const requestId = ++requestIdRef.current;
      try {
        // These two lookups do not depend on each other.
        const [foundTable, foundOrder] = await Promise.all([
          tables.findById(tableId),
          orderOverride ? Promise.resolve(orderOverride) : orders.findByTable(tableId),
        ]);
        if (!mountedRef.current || requestId !== requestIdRef.current) return;

        if (
          !foundTable ||
          !foundOrder ||
          foundOrder.status === "paid" ||
          foundOrder.status === "closed_with_pending"
        ) {
          setTable(foundTable);
          setOrder(null);
          setAccounts([]);
          setCustomers([]);
          setAccountAllocations([]);
          setAccountPaidById({});
          setLoadState("empty");
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
        if (!mountedRef.current || requestId !== requestIdRef.current) return;

        // Publish the complete visible snapshot in one React update batch.
        setTable(foundTable);
        setOrder(foundOrder);
        setAccounts(foundAccounts);
        setCustomers(allCustomers);
        setAccountAllocations(foundAllocations);
        setAccountPaidById(
          Object.fromEntries(
            foundAccounts.map((account, index) => [
              account.id,
              paymentsByAccount[index]?.reduce((sum, payment) => sum + payment.amountCents, 0) ?? 0,
            ]),
          ),
        );
        setLoadState("ready");
        window.dispatchEvent(
          new CustomEvent("kutana.order.updated", {
            detail: {
              orderId: foundOrder.id,
              tableId,
              orderCount: foundOrder.lineItems.reduce((sum, line) => sum + line.quantity, 0),
            },
          }),
        );
      } catch (error) {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        console.error("[orders] failed loading selected order", { tableId, error });
        setLoadState("error");
      }
    },
    [customersPort, orders, payments, personalAccounts, tableId, tables],
  );

  useEffect(() => {
    mountedRef.current = true;
    void loadOrder();
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, [loadOrder]);

  useEffect(() => {
    onLoadStateChange?.(loadState);
  }, [loadState, onLoadStateChange]);

  useEffect(() => {
    if (loadState !== "ready" || !order) return;
    return events.subscribe(order.id, (event) => {
      void loadOrder(event.payload);
    });
  }, [events, loadOrder, loadState, order?.id]);

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
      }
      events.publish({
        type: shouldCloseEmptyOrder ? "order.closed" : "order.updated",
        orderId: saved.id,
        tableId,
        version: saved.version,
        at: new Date().toISOString(),
        payload: saved,
      });
      void loadOrder();
    } catch (error) {
      if (error instanceof ConflictError) {
        void loadOrder();
      } else {
        throw error;
      }
    }
  }

  if (loadState === "loading") {
    return <p role="status">Cargando orden…</p>;
  }
  if (loadState === "error") {
    return <p role="alert">No se pudo cargar la orden.</p>;
  }
  if (loadState === "empty" || !table || !order) return null;

  const accountOwnerLabel = (account: PersonalAccount): string => {
    if (account.owner.kind === "free_name") return account.owner.freeName;
    const customerId = account.owner.customerId;
    return customers.find((customer) => customer.id === customerId)?.displayName ?? customerId;
  };
  const accountPaidCents = Object.values(accountPaidById).reduce((sum, amount) => sum + amount, 0);
  const paidCentsByLineId = new Map<string, number>();
  const lineById = new Map(order.lineItems.map((line) => [line.id, line]));
  for (const account of accounts) {
    const allocations = accountAllocations.filter((allocation) => allocation.accountId === account.id);
    const values = allocations.map((allocation) => {
      const line = lineById.get(allocation.lineItemId);
      return line ? Math.round((line.totalCents / line.quantity) * allocation.quantity) : 0;
    });
    const accountTotalCents = values.reduce((sum, value) => sum + value, 0);
    let remainingPaidCents = Math.min(accountPaidById[account.id] ?? 0, accountTotalCents);
    allocations.forEach((allocation, index) => {
      const value = values[index] ?? 0;
      const paid = index === allocations.length - 1
        ? remainingPaidCents
        : accountTotalCents > 0 ? Math.floor((remainingPaidCents * value) / accountTotalCents) : 0;
      remainingPaidCents -= paid;
      paidCentsByLineId.set(
        allocation.lineItemId,
        (paidCentsByLineId.get(allocation.lineItemId) ?? 0) + paid,
      );
    });
  }
  const lines = aggregateLines(order.lineItems, paidCentsByLineId);
  const paymentDetails: OrderPaymentDetailLine[] = order.lineItems.map((line) => {
    const lineAllocations = accountAllocations.filter(
      (allocation) => allocation.lineItemId === line.id,
    );
    const payerIds = [...new Set(lineAllocations.map((allocation) => allocation.accountId))];
    const payerLabels = payerIds.map((accountId) => {
      const account = accounts.find((candidate) => candidate.id === accountId);
      return account ? accountOwnerLabel(account) : accountId;
    });
    const paidCents = paidCentsByLineId.get(line.id) ?? 0;
    return {
      id: line.id,
      name: line.nameSnapshot,
      quantity: line.quantity,
      payerLabels,
      status: paidCents >= line.totalCents && line.totalCents > 0 ? "paid" : paidCents > 0 ? "partial" : "pending",
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
      paidLineCount={paymentDetails
        .filter((line) => line.status === "paid")
        .reduce((sum, line) => sum + line.quantity, 0)}
      pendingLineCount={paymentDetails
        .filter((line) => line.status !== "paid")
        .reduce((sum, line) => sum + line.quantity, 0)}
      paymentDetails={paymentDetails}
      onRemoveLine={
        order.status === "paid" || order.status === "closed_with_pending"
          ? undefined
          : (lineId) => void handleRemoveLine(lineId)
      }
    />
  );
}
