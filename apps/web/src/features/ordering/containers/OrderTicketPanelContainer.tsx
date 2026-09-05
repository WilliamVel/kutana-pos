import { useEffect, useState } from "react";
import { ConflictError } from "@kutana/shared/errors/conflict-error.js";
import type {
  Order,
  OrderStatus as DomainOrderStatus,
} from "@kutana/shared/ordering/model/order.js";
import type { Table } from "@kutana/shared/ordering/model/table.js";
import { removeLineItem } from "@kutana/shared/ordering/services/line-item-service.js";
import { useOrderEvents, useOrders, useTables } from "../../../composition/PortsProvider.js";
import { OrderTicketPanel, type OrderTicketPanelLine } from "../components/OrderTicketPanel.js";
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

function aggregateLines(lines: readonly LineItem[]): OrderTicketPanelLine[] {
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

  async function handleRemoveLine(lineId: string): Promise<void> {
    const current = await orders.findByTable(tableId);
    if (!current) return;

    const next = removeLineItem(current, lineId);
    try {
      const saved = await orders.save(next, current.version);
      setOrder(saved);
      events.publish({
        type: "order.updated",
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

  const lines = aggregateLines(order.lineItems);
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
      onRemoveLine={
        order.status === "paid" || order.status === "closed_with_pending"
          ? undefined
          : (lineId) => void handleRemoveLine(lineId)
      }
    />
  );
}
