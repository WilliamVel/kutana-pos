import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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

export type OrdersOverviewLoadState =
  "initial-loading" | "refreshing" | "success" | "empty" | "error";

export type SelectedOrderState = "pending" | "valid" | "invalid";

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
  readonly onSelectionStateChange?: (state: SelectedOrderState) => void;
  readonly onOrderRemoved?: () => void;
  readonly onNewOrder?: () => void;
  readonly newOrder?: ReactNode;
  readonly reloadKey?: number;
}

/**
 * Loads a complete snapshot of the active-order list before replacing the
 * visible rows. Existing rows remain visible while a later snapshot loads.
 */
export function OrdersOverviewContainer({
  selectedTableId,
  onSelectTable,
  onSelectionStateChange,
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
  const [loadState, setLoadState] = useState<OrdersOverviewLoadState>("initial-loading");
  const requestIdRef = useRef(0);
  const mountedRef = useRef(false);
  const hasConfirmedSnapshotRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadTableRow = useCallback(
    async (table: Table): Promise<OrdersOverviewRow | null> => {
      console.info("[orders] loading table", { tableId: table.id, label: table.label });
      const order = await orders.findByTable(table.id);
      console.info("[orders] table response", { tableId: table.id, order });
      const row = await toRow(table, order, personalAccounts, payments);
      console.info("[orders] row result", { tableId: table.id, row });
      return row;
    },
    [orders, payments, personalAccounts],
  );

  useEffect(() => {
    let cancelled = false;
    const requestId = ++requestIdRef.current;
    const hasPreviousSnapshot = hasConfirmedSnapshotRef.current;
    setLoadError(null);
    setLoadState(hasPreviousSnapshot ? "refreshing" : "initial-loading");
    console.info("[orders] loading tables");

    async function load(): Promise<void> {
      try {
        const allTables = await tables.listAll();
        console.info("[orders] tables response", allTables);
        if (cancelled || !mountedRef.current || requestId !== requestIdRef.current) return;

        const results = await Promise.allSettled(allTables.map((table) => loadTableRow(table)));
        if (cancelled || !mountedRef.current || requestId !== requestIdRef.current) return;

        const failures = results.filter(
          (result): result is PromiseRejectedResult => result.status === "rejected",
        );
        failures.forEach((failure) => {
          console.error("[orders] failed loading table", failure.reason);
        });
        if (failures.length > 0) {
          throw failures[0]?.reason ?? new Error("Unable to load orders");
        }

        const successfulResults = results.filter(
          (result): result is PromiseFulfilledResult<OrdersOverviewRow | null> =>
            result.status === "fulfilled",
        );
        const nextRows = successfulResults
          .map((result) => result.value)
          .filter((row): row is OrdersOverviewRow => row !== null);

        // Publish one complete snapshot. Never expose the intermediate rows
        // produced while the individual table requests are still pending.
        setTableList(allTables);
        setRows(nextRows);
        hasConfirmedSnapshotRef.current = true;
        setLoadState(nextRows.length > 0 ? "success" : "empty");
        console.info("[orders] load completed", {
          tables: allTables.length,
          rows: nextRows.length,
        });
      } catch (error) {
        console.error("[orders] failed loading orders", error);
        if (cancelled || !mountedRef.current || requestId !== requestIdRef.current) return;
        setLoadError(error instanceof Error ? error.message : String(error));
        // A failed refresh is non-destructive: keep the last confirmed rows.
        setLoadState("error");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [loadTableRow, reloadKey, tables]);

  const refreshTable = useCallback(
    async (table: Table): Promise<void> => {
      const requestId = ++requestIdRef.current;
      setLoadState((current) => (current === "initial-loading" ? current : "refreshing"));
      try {
        const row = await loadTableRow(table);
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        setRows((current) => {
          const withoutTable = current.filter((existing) => existing.tableId !== table.id);
          return row ? [...withoutTable, row] : withoutTable;
        });
        setLoadError(null);
        setLoadState((current) => (current === "initial-loading" ? current : "success"));
      } catch (error) {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;
        console.error("[orders] failed refreshing table", { tableId: table.id, error });
        setLoadError(error instanceof Error ? error.message : String(error));
        setLoadState("error");
      }
    },
    [loadTableRow],
  );

  useEffect(() => {
    if (!hasConfirmedSnapshotRef.current) return;

    const unsubscribes = tableList.map((table) => {
      return table.currentOrderId
        ? events.subscribe(table.currentOrderId, () => {
            void refreshTable(table);
          })
        : () => {};
    });
    return () => {
      for (const unsubscribe of unsubscribes) unsubscribe();
    };
  }, [tableList, events, refreshTable]);

  useEffect(() => {
    if (!selectedTableId) {
      onSelectionStateChange?.("invalid");
      return;
    }
    if (loadState === "initial-loading" || loadState === "refreshing") {
      onSelectionStateChange?.("pending");
      return;
    }
    onSelectionStateChange?.(
      rows.some((row) => row.tableId === selectedTableId) ? "valid" : "invalid",
    );
  }, [loadState, onSelectionStateChange, rows, selectedTableId]);

  async function removeEmptyOrder(tableId: string): Promise<void> {
    const table = await tables.findById(tableId);
    const order = await orders.findByTable(tableId);
    if (!table || !order || order.lineItems.length > 0) return;

    await orders.deleteEmpty(order.id, order.version);
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

  return (
    <OrdersOverview
      rows={[...rows].sort((a, b) => a.tableLabel.localeCompare(b.tableLabel))}
      selectedTableId={selectedTableId}
      onSelectTable={onSelectTable}
      onRemoveEmptyOrder={(tableId) => void removeEmptyOrder(tableId)}
      onNewOrder={onNewOrder}
      newOrder={newOrder}
      loadError={loadError}
      loadState={loadState}
    />
  );
}
