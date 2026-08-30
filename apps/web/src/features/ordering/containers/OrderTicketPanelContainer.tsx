import { useEffect, useState } from "react";
import type {
  Order,
  OrderStatus as DomainOrderStatus,
} from "@kutana/shared/ordering/model/order.js";
import type { Table } from "@kutana/shared/ordering/model/table.js";
import { useOrderEvents, useOrders, useTables } from "../../../composition/PortsProvider.js";
import { OrderTicketPanel, type OrderTicketPanelLine } from "../components/OrderTicketPanel.js";
import type { OrderStatus } from "../../../design-system/molecules/StatusPill.js";

const STATUS_MAP: Record<DomainOrderStatus, OrderStatus> = {
  active: "active",
  needs_check: "needs-check",
  paid: "paid",
};

export interface OrderTicketPanelContainerProps {
  readonly tableId: string;
}

/**
 * Shows one table's order as a single ticket (splitting into multiple
 * tickets is PR7's split-bill screen, out of scope here) and subscribes to
 * `OrderEvents` so it stays live if the order changes on another device
 * while this panel is open.
 */
export function OrderTicketPanelContainer({
  tableId,
}: OrderTicketPanelContainerProps): JSX.Element | null {
  const tables = useTables();
  const orders = useOrders();
  const events = useOrderEvents();

  const [table, setTable] = useState<Table | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      const foundTable = await tables.findById(tableId);
      if (cancelled) return;
      setTable(foundTable);
      const foundOrder = await orders.findByTable(tableId);
      if (cancelled) return;
      setOrder(foundOrder);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [tableId, tables, orders]);

  useEffect(() => {
    if (!order) return;
    return events.subscribe(order.id, (event) => {
      setOrder(event.payload);
    });
  }, [order?.id, events]);

  if (!table || !order) return null;

  const lines: OrderTicketPanelLine[] = order.lineItems.map((line) => ({
    id: line.id,
    name: line.nameSnapshot,
    quantity: line.quantity,
    unitPriceCents: line.unitPriceCents,
    totalCents: line.totalCents,
    pourSizeMl: line.pourSizeMl as OrderTicketPanelLine["pourSizeMl"],
    isAdjustment: line.isAdjustment,
  }));
  const subtotalCents = order.lineItems.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0,
  );
  // Tax is the SUM of each line item's persisted at-sale-time taxCents —
  // never recomputed from the current catalog rate (spec: "Tax Persisted
  // at Sale Time").
  const taxCents = order.lineItems.reduce((sum, line) => sum + line.taxCents, 0);
  const totalCents = order.lineItems.reduce((sum, line) => sum + line.totalCents, 0);

  return (
    <OrderTicketPanel
      tableLabel={table.label}
      status={STATUS_MAP[order.status]}
      lines={lines}
      subtotalCents={subtotalCents}
      taxCents={taxCents}
      totalCents={totalCents}
    />
  );
}
