import { useState } from "react";
import { AppShell } from "./app-shell/components/AppShell.js";
import { SideBar } from "./app-shell/components/SideBar.js";
import { TopBar } from "./app-shell/components/TopBar.js";
import { screenTitle, type ScreenId } from "./app-shell/screens.js";
import { Panel } from "./design-system/molecules/Panel.js";
import { ProductFormContainer } from "./features/catalog/containers/ProductFormContainer.js";
import { InventoryListContainer } from "./features/inventory/containers/InventoryListContainer.js";
import { OrderTicketPanelContainer } from "./features/ordering/containers/OrderTicketPanelContainer.js";
import { OrdersOverviewContainer } from "./features/ordering/containers/OrdersOverviewContainer.js";
import { RegisterPaymentContainer } from "./features/register/containers/RegisterPaymentContainer.js";
import { SplitBillContainer } from "./features/split-bill/containers/SplitBillContainer.js";

/**
 * Root screen shell for the milestone-1 demo. Navigation state lives here;
 * layout chrome (top bar, sidebar, optional bottom action bar) is provided
 * by <AppShell> and the app-shell components. Each screen below is a
 * container that wires its own ports.
 */
export function App(): JSX.Element {
  const [screen, setScreen] = useState<ScreenId>("inventory");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const navigate = (next: ScreenId): void => {
    if (next === "register") {
      setSelectedTicketId(null);
    }
    setScreen(next);
  };

  return (
    <AppShell
      topBar={<TopBar currentScreen={screen} onNavigate={navigate} />}
      sidebar={<SideBar screenTitle={screenTitle(screen)} />}
    >
      {screen === "inventory" ? <InventoryListContainer /> : null}

      {screen === "new-product" ? (
        <Panel>
          <ProductFormContainer
            onSaved={() => setScreen("inventory")}
            onCancel={() => setScreen("inventory")}
          />
        </Panel>
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
    </AppShell>
  );
}
