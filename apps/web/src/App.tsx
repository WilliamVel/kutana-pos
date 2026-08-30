import { useState } from "react";
import { ProductFormContainer } from "./features/catalog/containers/ProductFormContainer.js";
import { InventoryListContainer } from "./features/inventory/containers/InventoryListContainer.js";
import { AddItemContainer } from "./features/ordering/containers/AddItemContainer.js";
import { OrderTicketPanelContainer } from "./features/ordering/containers/OrderTicketPanelContainer.js";
import { OrdersOverviewContainer } from "./features/ordering/containers/OrdersOverviewContainer.js";
import { RegisterPaymentContainer } from "./features/register/containers/RegisterPaymentContainer.js";
import { SplitBillContainer } from "./features/split-bill/containers/SplitBillContainer.js";

type Screen = "inventory" | "new-product" | "orders" | "register" | "split-bill";

/**
 * Root screen shell for the milestone-1 demo: a plain screen switcher, no
 * router library needed for this PR's scope (inventory, product form,
 * all-orders + ticket panel, register/payment). Each screen below is a
 * container that wires its own ports; `App` holds only navigation state.
 */
export function App(): JSX.Element {
  const [screen, setScreen] = useState<Screen>("inventory");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  return (
    <main>
      <h1>KUTANA POS</h1>
      <nav>
        <button type="button" onClick={() => setScreen("inventory")}>
          Inventory
        </button>
        <button type="button" onClick={() => setScreen("new-product")}>
          Add product
        </button>
        <button type="button" onClick={() => setScreen("orders")}>
          Orders
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedTicketId(null);
            setScreen("register");
          }}
        >
          Register
        </button>
        <button type="button" onClick={() => setScreen("split-bill")}>
          Split Bill
        </button>
      </nav>

      {screen === "inventory" ? <InventoryListContainer /> : null}

      {screen === "new-product" ? (
        <ProductFormContainer
          onSaved={() => setScreen("inventory")}
          onCancel={() => setScreen("inventory")}
        />
      ) : null}

      {screen === "orders" ? (
        <div>
          <OrdersOverviewContainer
            selectedTableId={selectedTableId}
            onSelectTable={setSelectedTableId}
          />
          {selectedTableId ? (
            <div>
              <OrderTicketPanelContainer tableId={selectedTableId} />
              <AddItemContainer tableId={selectedTableId} />
            </div>
          ) : null}
        </div>
      ) : null}

      {screen === "register" ? (
        <div>
          <OrdersOverviewContainer
            selectedTableId={selectedTableId}
            onSelectTable={setSelectedTableId}
          />
          {selectedTableId ? (
            <RegisterPaymentContainer
              tableId={selectedTableId}
              ticketId={selectedTicketId ?? undefined}
            />
          ) : null}
        </div>
      ) : null}

      {screen === "split-bill" ? (
        <div>
          <OrdersOverviewContainer
            selectedTableId={selectedTableId}
            onSelectTable={(tableId) => {
              setSelectedTicketId(null);
              setSelectedTableId(tableId);
            }}
          />
          {selectedTableId ? (
            <SplitBillContainer
              tableId={selectedTableId}
              onPayTicket={(ticketId) => {
                setSelectedTicketId(ticketId);
                setScreen("register");
              }}
            />
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
