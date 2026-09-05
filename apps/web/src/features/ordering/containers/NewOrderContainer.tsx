import { useCallback, useEffect, useState } from "react";
import { ConflictError } from "@kutana/shared/errors/conflict-error.js";
import { createOrder } from "@kutana/shared/ordering/model/order.js";
import { createTable, occupyTable, type Table } from "@kutana/shared/ordering/model/table.js";
import { useOrderEvents, useOrders, useTables } from "../../../composition/PortsProvider.js";
import { NewOrderButton } from "../components/NewOrderButton.js";

export interface NewOrderContainerProps {
  /** Called with the table id after its new (empty) order is created. */
  readonly onCreated: (tableId: string) => void;
}

/**
 * Wires `NewOrderButton` to the ordering ports. Mirrors the future
 * `POST /orders { tableId }` -> 201 Order: pick a free table, insert an
 * empty order, occupy the table, and announce it on `OrderEvents` so the
 * all-orders view picks up the new row. Follows the codebase's
 * read -> apply-domain-fn -> save -> catch-`ConflictError` seam.
 */
export function NewOrderContainer({ onCreated }: NewOrderContainerProps): JSX.Element {
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
  }, [loadFreeTables]);

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
      onCreated(table.id);
    } catch (error) {
      if (error instanceof ConflictError) {
        setMessage("That table was just taken — pick another.");
        await loadFreeTables();
        return;
      }
      throw error;
    }
  }

  async function createTableAndOrder(label: string): Promise<void> {
    const savedTable = await tables.save(createTable({ label }), 0);
    await createOrderForTable(savedTable);
  }

  return (
    <NewOrderButton
      freeTables={freeTables.map((table) => ({ id: table.id, label: table.label }))}
      onSelectTable={(tableId) => {
        const table = freeTables.find((candidate) => candidate.id === tableId);
        if (table) void createOrderForTable(table);
      }}
      onCreateTable={(label) => void createTableAndOrder(label)}
      message={message}
    />
  );
}
