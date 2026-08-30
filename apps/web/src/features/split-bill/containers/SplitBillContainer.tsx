import { useCallback, useEffect, useState } from "react";
import type { Allocation } from "@kutana/shared/billing/model/allocation.js";
import { createAllocation } from "@kutana/shared/billing/model/allocation.js";
import { createTicket, type Ticket } from "@kutana/shared/billing/model/ticket.js";
import { splitAllocation, ticketTotals } from "@kutana/shared/billing/services/split-allocation.js";
import { ConflictError } from "@kutana/shared/errors/conflict-error.js";
import type { Order } from "@kutana/shared/ordering/model/order.js";
import type { Table } from "@kutana/shared/ordering/model/table.js";
import { useOrders, useTables, useTickets } from "../../../composition/PortsProvider.js";
import { Button } from "../../../design-system/atoms/Button.js";
import { ConflictBanner } from "../components/ConflictBanner.js";
import { SplitBillView, type SplitBillLine } from "../components/SplitBillView.js";
import styles from "./SplitBillContainer.module.css";

export interface SplitBillContainerProps {
  readonly tableId: string;
  /**
   * Lets the caller (the app shell) navigate to the register screen for a
   * SPECIFIC ticket once it has been split off — the milestone-1 exit
   * scenario is splitting a bill into two tickets and paying each one
   * independently. Rendered as two "Pay this bill" buttons when provided;
   * omitted entirely (no buttons) when not, so this container stays usable
   * standalone (e.g. in tests) without a navigation callback.
   */
  readonly onPayTicket?: (ticketId: string) => void;
}

/**
 * Any mock repository can be armed to throw a `ConflictError` on its next
 * write via its `conflictTrigger` (see `adapters/mock/conflict-trigger.ts`).
 * The `TicketRepository` PORT deliberately does not declare this field — it
 * is a demo/test-only capability of the mock adapter, not part of the real
 * contract an HTTP adapter would implement. `features/**` may not import
 * the adapter to check for it (the adapter-import guard would reject that),
 * so this container duck-types the field on whatever concrete port it was
 * handed instead. Under a real HTTP-backed port at milestone 2, `trigger`
 * below is simply `undefined` and the debug button never renders.
 */
interface MaybeHasConflictTrigger {
  readonly conflictTrigger?: { forceNextConflict(): void };
}

function toLines(
  order: Order,
  allocations: readonly Allocation[],
  ticketId: string,
): SplitBillLine[] {
  const allocatedLineItemIds = new Set(
    allocations.filter((allocation) => allocation.ticketId === ticketId).map((a) => a.lineItemId),
  );
  return order.lineItems
    .filter((line) => allocatedLineItemIds.has(line.id))
    .map((line) => ({
      id: line.id,
      name: line.nameSnapshot,
      quantity: line.quantity,
      totalCents: line.totalCents,
    }));
}

/**
 * Wires the split-bill screen — the milestone-1 demo centerpiece — to the
 * billing domain. Ensures the order has exactly two tickets ("Original
 * Bill" and "New Bill", the second created empty on first visit) and moves
 * items between them exclusively by repointing Allocations via
 * `splitAllocation` (`packages/shared`) — the LineItem itself, and the
 * Order it belongs to, are never touched. On `ConflictError` from a save,
 * refreshes all state from the ports and shows a non-technical banner;
 * dismissing it re-enables the move buttons.
 */
export function SplitBillContainer({
  tableId,
  onPayTicket,
}: SplitBillContainerProps): JSX.Element | null {
  const tables = useTables();
  const orders = useOrders();
  const ticketsPort = useTickets();

  const [table, setTable] = useState<Table | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [ticketsState, setTicketsState] = useState<Ticket[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const foundTable = await tables.findById(tableId);
    if (!foundTable) return;
    setTable(foundTable);

    const foundOrder = await orders.findByTable(tableId);
    if (!foundOrder) return;
    setOrder(foundOrder);

    let orderTickets = await ticketsPort.listByOrder(foundOrder.id);
    let orderAllocations = await ticketsPort.listAllocationsByOrder(foundOrder.id);

    if (orderTickets.length === 0) {
      const originalTicket = createTicket({ orderId: foundOrder.id, label: "Original Bill" });
      const initialAllocations = foundOrder.lineItems.map((line) =>
        createAllocation({ lineItemId: line.id, ticketId: originalTicket.id }),
      );
      const saved = await ticketsPort.save(originalTicket, initialAllocations, 0);
      orderTickets = [saved];
      orderAllocations = initialAllocations;
    }

    const originalTicket = orderTickets[0]!;
    let newTicket = orderTickets.find((ticket) => ticket.id !== originalTicket.id) ?? null;

    if (!newTicket) {
      const created = createTicket({ orderId: foundOrder.id, label: "New Bill" });
      newTicket = await ticketsPort.save(created, orderAllocations, 0);
      orderTickets = [...orderTickets, newTicket];
    }

    setTicketsState(orderTickets);
    setAllocations(orderAllocations);
  }, [tableId, tables, orders, ticketsPort]);

  useEffect(() => {
    void load();
  }, [load]);

  const originalTicket = ticketsState[0] ?? null;
  const newTicket = ticketsState[1] ?? null;

  const moveItem = useCallback(
    async (lineItemId: string, toTicketId: string, fromTicketId: string): Promise<void> => {
      setBusy(true);
      try {
        const { allocations: nextAllocations } = splitAllocation({
          allocations,
          tickets: ticketsState,
          lineItemId,
          toTicketId,
          payments: [],
        });
        const fromTicket = ticketsState.find((ticket) => ticket.id === fromTicketId);
        if (!fromTicket) return;

        const saved = await ticketsPort.save(fromTicket, nextAllocations, fromTicket.version);
        setAllocations(nextAllocations);
        setTicketsState((current) =>
          current.map((ticket) => (ticket.id === saved.id ? saved : ticket)),
        );
        setConflictMessage(null);
      } catch (error) {
        if (error instanceof ConflictError) {
          await load();
          setConflictMessage(
            "This bill changed on another device. We've refreshed it below — please check the totals and try your move again.",
          );
        } else {
          throw error;
        }
      } finally {
        setBusy(false);
      }
    },
    [allocations, ticketsState, ticketsPort, load],
  );

  if (!table || !order || !originalTicket || !newTicket) return null;

  const originalTotalCents = ticketTotals(originalTicket.id, order.lineItems, allocations).cents;
  const newTotalCents = ticketTotals(newTicket.id, order.lineItems, allocations).cents;

  const conflictTrigger = (ticketsPort as unknown as MaybeHasConflictTrigger).conflictTrigger;

  return (
    <div className={styles.screen}>
      <h2>{table.label} — Split Bill</h2>

      {conflictMessage ? (
        <ConflictBanner message={conflictMessage} onDismiss={() => setConflictMessage(null)} />
      ) : null}

      <SplitBillView
        originalLines={toLines(order, allocations, originalTicket.id)}
        newLines={toLines(order, allocations, newTicket.id)}
        originalTotalCents={originalTotalCents}
        newTotalCents={newTotalCents}
        onMoveToNew={(lineItemId) => void moveItem(lineItemId, newTicket.id, originalTicket.id)}
        onMoveToOriginal={(lineItemId) =>
          void moveItem(lineItemId, originalTicket.id, newTicket.id)
        }
        disabled={busy || conflictMessage !== null}
      />

      {onPayTicket ? (
        <div className={styles.payButtons}>
          <Button onClick={() => onPayTicket(originalTicket.id)}>Pay Original Bill</Button>
          <Button onClick={() => onPayTicket(newTicket.id)}>Pay New Bill</Button>
        </div>
      ) : null}

      {conflictTrigger ? (
        <Button variant="secondary" onClick={() => conflictTrigger.forceNextConflict()}>
          Force conflict (demo)
        </Button>
      ) : null}
    </div>
  );
}
