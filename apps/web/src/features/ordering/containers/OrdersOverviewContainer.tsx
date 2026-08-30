import { useCallback, useEffect, useState } from "react";
import type {
  Order,
  OrderStatus as DomainOrderStatus,
} from "@kutana/shared/ordering/model/order.js";
import type { Table } from "@kutana/shared/ordering/model/table.js";
import { useOrderEvents, useOrders, useTables } from "../../../composition/PortsProvider.js";
import { OrdersOverview, type OrdersOverviewRow } from "../components/OrdersOverview.js";
import type { OrderStatus } from "../../../design-system/molecules/StatusPill.js";

const STATUS_MAP: Record<DomainOrderStatus, OrderStatus> = {
  active: "active",
  needs_check: "needs-check",
  paid: "paid",
};

function toRow(table: Table, order: Order | null): OrdersOverviewRow | null {
  if (!order) return null;
  return {
    tableId: table.id,
    tableLabel: table.label,
    status: STATUS_MAP[order.status],
    itemCount: order.lineItems.length,
    totalCents: order.lineItems.reduce((sum, line) => sum + line.totalCents, 0),
    openedAt: order.openedAt,
  };
}

export interface OrdersOverviewContainerProps {
  readonly selectedTableId: string | null;
  readonly onSelectTable: (tableId: string) => void;
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
}: OrdersOverviewContainerProps): JSX.Element {
  const tables = useTables();
  const orders = useOrders();
  const events = useOrderEvents();

  const [rows, setRows] = useState<OrdersOverviewRow[]>([]);
  const [tableList, setTableList] = useState<Table[]>([]);

  const refreshTable = useCallback(
    async (table: Table) => {
      const order = await orders.findByTable(table.id);
      const row = toRow(table, order);
      setRows((current) => {
        const withoutTable = current.filter((existing) => existing.tableId !== table.id);
        return row ? [...withoutTable, row] : withoutTable;
      });
      return order;
    },
    [orders],
  );

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      const allTables = await tables.listAll();
      if (cancelled) return;
      setTableList(allTables);
      await Promise.all(allTables.map((table) => refreshTable(table)));
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [tables, refreshTable]);

  useEffect(() => {
    const unsubscribes = tableList.map((table) => {
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
  }, [tableList, events, refreshTable]);

  return (
    <OrdersOverview
      rows={rows.sort((a, b) => a.tableLabel.localeCompare(b.tableLabel))}
      selectedTableId={selectedTableId}
      onSelectTable={onSelectTable}
    />
  );
}
