import { useState } from "react";
import { ProductFormContainer } from "./features/catalog/containers/ProductFormContainer.js";
import { InventoryListContainer } from "./features/inventory/containers/InventoryListContainer.js";
import { OrderTicketPanelContainer } from "./features/ordering/containers/OrderTicketPanelContainer.js";
import { OrdersOverviewContainer } from "./features/ordering/containers/OrdersOverviewContainer.js";
import { RegisterPaymentContainer } from "./features/register/containers/RegisterPaymentContainer.js";

type Screen = "inventory" | "new-product" | "orders" | "register";

/**
 * Root screen shell for the milestone-1 demo: a plain screen switcher, no
 * router library needed for this PR's scope (inventory, product form,
 * all-orders + ticket panel, register/payment). Each screen below is a
 * container that wires its own ports; `App` holds only navigation state.
 */
export function App(): JSX.Element {
  const [screen, setScreen] = useState<Screen>("inventory");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

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
        <button type="button" onClick={() => setScreen("register")}>
          Register
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
          {selectedTableId ? <OrderTicketPanelContainer tableId={selectedTableId} /> : null}
        </div>
      ) : null}

      {screen === "register" ? (
        <div>
          <OrdersOverviewContainer
            selectedTableId={selectedTableId}
            onSelectTable={setSelectedTableId}
          />
          {selectedTableId ? <RegisterPaymentContainer tableId={selectedTableId} /> : null}
        </div>
      ) : null}
    </main>
  );
}
