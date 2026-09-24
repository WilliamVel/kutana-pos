import { useCallback, useEffect, useState } from "react";
import { ConflictError } from "@kutana/shared/errors/conflict-error.js";
import { createOrder } from "@kutana/shared/ordering/model/order.js";
import { createTable, occupyTable, type Table } from "@kutana/shared/ordering/model/table.js";
import { useOrderEvents, useOrders, useTables } from "../../../composition/PortsProvider.js";
import { NewOrderButton } from "../components/NewOrderButton.js";

export interface NewOrderContainerProps {
  /** Called with the table and persisted order IDs after creation succeeds. */
  readonly onCreated: (tableId: string, orderId: string) => void;
  readonly reloadKey?: number;
  readonly openRequest?: number;
}

/**
 * Wires `NewOrderButton` to the ordering ports. Mirrors the future
 * `POST /orders { tableId }` -> 201 Order: pick a free table, insert an
 * empty order, occupy the table, and announce it on `OrderEvents` so the
 * all-orders view picks up the new row. Follows the codebase's
 * read -> apply-domain-fn -> save -> catch-`ConflictError` seam.
 */
export function NewOrderContainer({
  onCreated,
  reloadKey = 0,
  openRequest = 0,
}: NewOrderContainerProps): JSX.Element {
  const tables = useTables();
  const orders = useOrders();
  const events = useOrderEvents();

  const [freeTables, setFreeTables] = useState<Table[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const loadFreeTables = useCallback(async () => {
    const all = await tables.listAll();
    setFreeTables(all.filter((table) => table.status === "free"));
  }, [tables]);

  useEffect(() => {
    void loadFreeTables();
  }, [loadFreeTables, reloadKey]);

  async function createOrderForTable(table: Table): Promise<void> {
    try {
      const order = createOrder({ tableId: table.id });
      const savedOrder = await orders.save(order, 0);
      const occupied = occupyTable(table, savedOrder.id);
      await tables.save(occupied, table.version);
      events.publish({
        type: "order.updated",
        orderId: savedOrder.id,
        tableId: table.id,
        version: savedOrder.version,
        at: new Date().toISOString(),
        payload: savedOrder,
      });
      setMessage(null);
      await loadFreeTables();
      onCreated(table.id, savedOrder.id);
      window.dispatchEvent(new CustomEvent("kutana.order.created"));
    } catch (error) {
      if (error instanceof ConflictError) {
        setMessage("Esa mesa ya está ocupada. Elige otra.");
        await loadFreeTables();
        throw new Error("Esa mesa ya está ocupada. Elige otra.");
      }
      throw error;
    }
  }

  async function createTableAndOrder(label: string): Promise<void> {
    const normalizedLabel = label.trim().toLocaleLowerCase();
    const retiredTable = (await tables.listAll()).find(
      (table) =>
        table.status === "retired" && table.label.trim().toLocaleLowerCase() === normalizedLabel,
    );
    const savedTable = retiredTable
      ? await tables.save(
          { ...retiredTable, status: "free", currentOrderId: null },
          retiredTable.version,
        )
      : await tables.save(createTable({ label }), 0);
    await createOrderForTable(savedTable);
  }

  async function removeFreeTable(tableId: string): Promise<void> {
    try {
      const table = await tables.findById(tableId);
      if (!table || table.status !== "free" || table.currentOrderId) return;
      await tables.deleteFree(table.id, table.version);
      await loadFreeTables();
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo eliminar la mesa.");
    }
  }

  return (
    <NewOrderButton
      freeTables={freeTables.map((table) => ({ id: table.id, label: table.label }))}
      onRemoveTable={(tableId) => void removeFreeTable(tableId)}
      onSelectTable={(tableId) => {
        const table = freeTables.find((candidate) => candidate.id === tableId);
        return table ? createOrderForTable(table) : Promise.resolve();
      }}
      onCreateTable={(label) => createTableAndOrder(label)}
      message={message}
      openRequest={openRequest}
    />
  );
}
