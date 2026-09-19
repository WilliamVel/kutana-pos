import { useCallback, useEffect, useState, type ReactNode } from "react";
import type {
  Order,
  OrderStatus as DomainOrderStatus,
} from "@kutana/shared/ordering/model/order.js";
import type { Table } from "@kutana/shared/ordering/model/table.js";
import {
  useOrderEvents,
  useOrders,
  usePayments,
  usePersonalAccounts,
  useTables,
} from "../../../composition/PortsProvider.js";
import { OrdersOverview, type OrdersOverviewRow } from "../components/OrdersOverview.js";
import type { OrderStatus } from "../../../design-system/molecules/StatusPill.js";

const STATUS_MAP: Record<DomainOrderStatus, OrderStatus> = {
  active: "active",
  needs_check: "needs-check",
  in_review: "in-review",
  paid: "paid",
  closed_with_pending: "closed-with-pending",
};

function isActiveVisibleOrder(order: Order): boolean {
  return order.status !== "paid" && order.status !== "closed_with_pending";
}

async function toRow(
  table: Table,
  order: Order | null,
  personalAccounts: ReturnType<typeof usePersonalAccounts>,
  payments: ReturnType<typeof usePayments>,
): Promise<OrdersOverviewRow | null> {
  if (!order || !isActiveVisibleOrder(order)) return null;
  const originalTotalCents = order.lineItems.reduce((sum, line) => sum + line.totalCents, 0);
  const accounts = await personalAccounts.listByOrder(order.id);
  const accountPayments = await Promise.all(
    accounts.map((account) =>
      payments.listByTarget({ kind: "personal_account", accountId: account.id }),
    ),
  );
  const paidCents = accountPayments.flat().reduce((sum, payment) => sum + payment.amountCents, 0);
  return {
    tableId: table.id,
    tableLabel: table.label,
    status: STATUS_MAP[order.status],
    itemCount: order.lineItems.length,
    totalCents: Math.max(0, originalTotalCents - paidCents),
    paidCents,
    originalTotalCents,
    openedAt: order.openedAt,
  };
}

export interface OrdersOverviewContainerProps {
  readonly selectedTableId: string | null;
  readonly onSelectTable: (tableId: string) => void;
  readonly onOrderRemoved?: () => void;
  readonly onNewOrder?: () => void;
  readonly newOrder?: ReactNode;
  /**
   * Bump this to force a full table-list + rows reload. The `OrderEvents`
   * subscription is keyed by each table's `currentOrderId` captured at load
   * time, so a table that becomes occupied AFTER mount (the "New order"
   * flow) is invisible until the list is re-fetched. App increments this
   * when a new order is created.
   */
  readonly reloadKey?: number;
}

/**
 * Fetches every table's current order and subscribes to `OrderEvents` so
 * this all-orders view updates in realtime when a waiter device edits an
 * order — the core "waiter -> register realtime" story. Holds no markup;
 * hands fully-formed rows to the presentational `OrdersOverview`.
 */
export function OrdersOverviewContainer({
  selectedTableId,
  onSelectTable,
  onOrderRemoved,
  onNewOrder,
  newOrder,
  reloadKey = 0,
}: OrdersOverviewContainerProps): JSX.Element {
  const tables = useTables();
  const orders = useOrders();
  const personalAccounts = usePersonalAccounts();
  const payments = usePayments();
  const events = useOrderEvents();

  const [rows, setRows] = useState<OrdersOverviewRow[]>([]);
  const [tableList, setTableList] = useState<Table[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [eventsReady, setEventsReady] = useState(false);

  const refreshTable = useCallback(
    async (table: Table) => {
      console.info("[orders] loading table", { tableId: table.id, label: table.label });
      const order = await orders.findByTable(table.id);
      console.info("[orders] table response", { tableId: table.id, order });
      const row = await toRow(table, order, personalAccounts, payments);
      setRows((current) => {
        const withoutTable = current.filter((existing) => existing.tableId !== table.id);
        return row ? [...withoutTable, row] : withoutTable;
      });
      console.info("[orders] row result", { tableId: table.id, row });
      return order;
    },
    [orders, payments, personalAccounts],
  );

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setLoadError(null);
      setEventsReady(false);
      console.info("[orders] loading tables");

      try {
        const allTables = await tables.listAll();
        console.info("[orders] tables response", allTables);
        if (cancelled) return;
        setTableList(allTables);
        setRows([]);

        const results = await Promise.allSettled(allTables.map((table) => refreshTable(table)));
        const failures = results.filter(
          (result): result is PromiseRejectedResult => result.status === "rejected",
        );
        failures.forEach((failure) => {
          console.error("[orders] failed loading table", failure.reason);
        });
        if (failures.length === allTables.length && allTables.length > 0) {
          throw failures[0]?.reason ?? new Error("Unable to load orders");
        }
        console.info("[orders] load completed", {
          tables: allTables.length,
          rows: failures.length === 0 ? "loaded" : `partial (${failures.length} failed)`,
        });
        setEventsReady(true);
      } catch (error) {
        console.error("[orders] failed loading orders", error);
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : String(error));
          setEventsReady(true);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [tables, refreshTable, reloadKey]);

  async function removeEmptyOrder(tableId: string): Promise<void> {
    const table = await tables.findById(tableId);
    const order = await orders.findByTable(tableId);
    if (!table || !order || order.lineItems.length > 0) return;

    await orders.deleteEmpty(order.id, order.version);
    // The HTTP adapter frees the table atomically with the order deletion.
    // The mock adapter only removes the order, so keep this fallback for it
    // without attempting a stale table update against PostgreSQL.
    const updatedTable = await tables.findById(tableId);
    if (updatedTable?.currentOrderId === order.id) {
      await tables.save(
        { ...updatedTable, status: "free", currentOrderId: null },
        updatedTable.version,
      );
    }
    setRows((current) => current.filter((row) => row.tableId !== tableId));
    onOrderRemoved?.();
  }

  useEffect(() => {
    if (!eventsReady) return;

    // Keep only the selected order subscribed. The HTTP adapter shares one
    // global EventSource, while the order id still limits local deliveries.
    const subscribedTables = selectedTableId
      ? tableList.filter((table) => table.id === selectedTableId)
      : [];
    const unsubscribes = subscribedTables.map((table) => {
      // The mock OrderEvents port is keyed by orderId, but a table's order
      // isn't known synchronously here; subscribing keyed by table's
      // CURRENT order id is refreshed every load. For the milestone-1 demo
      // (single open order per table, orderId stable across the session)
      // this is sufficient; re-subscribing per new order id is a
      // milestone-2 concern once orders can close/reopen mid-session.
      return table.currentOrderId
        ? events.subscribe(table.currentOrderId, () => {
            void refreshTable(table);
          })
        : () => {};
    });
    return () => {
      for (const unsubscribe of unsubscribes) unsubscribe();
    };
  }, [tableList, selectedTableId, events, eventsReady, refreshTable]);

  return (
    <OrdersOverview
      rows={rows.sort((a, b) => a.tableLabel.localeCompare(b.tableLabel))}
      selectedTableId={selectedTableId}
      onSelectTable={onSelectTable}
      onRemoveEmptyOrder={(tableId) => void removeEmptyOrder(tableId)}
      onNewOrder={onNewOrder}
      newOrder={newOrder}
      loadError={loadError}
    />
  );
}
