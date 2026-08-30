import { useState } from "react";
import { AppShell } from "./app-shell/components/AppShell.js";
import { TopBar } from "./app-shell/components/TopBar.js";
import type { ScreenId } from "./app-shell/screens.js";
import { Button } from "./design-system/atoms/Button.js";
import { Panel } from "./design-system/molecules/Panel.js";
import { ProductFormContainer } from "./features/catalog/containers/ProductFormContainer.js";
import { InventoryListContainer } from "./features/inventory/containers/InventoryListContainer.js";
import { RegisterWorkspace } from "./features/ordering/components/RegisterWorkspace.js";
import { AddItemContainer } from "./features/ordering/containers/AddItemContainer.js";
import { NewOrderContainer } from "./features/ordering/containers/NewOrderContainer.js";
import { OrderTicketPanelContainer } from "./features/ordering/containers/OrderTicketPanelContainer.js";
import { OrdersOverviewContainer } from "./features/ordering/containers/OrdersOverviewContainer.js";
import { RegisterPaymentContainer } from "./features/register/containers/RegisterPaymentContainer.js";
import { SplitBillContainer } from "./features/split-bill/containers/SplitBillContainer.js";

/** Center-column sub-state of the unified Register workspace. */
type CenterView = "ticket" | "payment" | "split";

/**
 * Root screen shell for the milestone-1 demo. Navigation state lives here;
 * layout chrome (top bar, optional bottom action bar) is provided by
 * <AppShell> and the app-shell components. Each screen below is a
 * container that wires its own ports.
 */
export function App(): JSX.Element {
  const [screen, setScreen] = useState<ScreenId>("inventory");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [centerView, setCenterView] = useState<CenterView>("ticket");
  const [ordersReloadKey, setOrdersReloadKey] = useState(0);

  const resetCenter = (): void => {
    setCenterView("ticket");
    setSelectedTicketId(null);
  };

  const navigate = (next: ScreenId): void => {
    if (next === "register") resetCenter();
    setScreen(next);
  };

  const selectTable = (tableId: string): void => {
    setSelectedTableId(tableId);
    resetCenter();
  };

  let center: JSX.Element | null = null;
  if (selectedTableId) {
    if (centerView === "payment") {
      center = (
        <>
          <RegisterPaymentContainer
            tableId={selectedTableId}
            ticketId={selectedTicketId ?? undefined}
          />
          <Button variant="secondary" onClick={resetCenter}>
            Back to order
          </Button>
        </>
      );
    } else if (centerView === "split") {
      center = (
        <>
          <SplitBillContainer
            tableId={selectedTableId}
            onPayTicket={(ticketId) => {
              setSelectedTicketId(ticketId);
              setCenterView("payment");
            }}
          />
          <Button variant="secondary" onClick={resetCenter}>
            Back to order
          </Button>
        </>
      );
    } else {
      center = (
        <>
          <OrderTicketPanelContainer tableId={selectedTableId} />
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <Button variant="secondary" onClick={() => setCenterView("split")}>
              Manage splits
            </Button>
            <Button
              onClick={() => {
                setSelectedTicketId(null);
                setCenterView("payment");
              }}
            >
              Proceed to payment
            </Button>
          </div>
        </>
      );
    }
  }

  return (
    <AppShell topBar={<TopBar currentScreen={screen} onNavigate={navigate} />}>
      {screen === "inventory" ? <InventoryListContainer /> : null}

      {screen === "new-product" ? (
        <Panel>
          <ProductFormContainer
            onSaved={() => setScreen("inventory")}
            onCancel={() => setScreen("inventory")}
          />
        </Panel>
      ) : null}

      {screen === "register" ? (
        <RegisterWorkspace
          list={
            <>
              <NewOrderContainer
                onCreated={(tableId) => {
                  selectTable(tableId);
                  setOrdersReloadKey((key) => key + 1);
                }}
              />
              <OrdersOverviewContainer
                selectedTableId={selectedTableId}
                onSelectTable={selectTable}
                reloadKey={ordersReloadKey}
              />
            </>
          }
          center={center}
          emptyCenter="Select an order to see its ticket."
          railHidden={centerView !== "ticket"}
          rail={
            selectedTableId && centerView === "ticket" ? (
              <AddItemContainer tableId={selectedTableId} />
            ) : (
              <p>
                {selectedTableId
                  ? "Finish or leave payment to add more items."
                  : "Select an order to add items."}
              </p>
            )
          }
        />
      ) : null}
    </AppShell>
  );
}
