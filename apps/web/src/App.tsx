import { useState } from "react";
import type { AuthSession } from "@kutana/shared/auth/model/auth-session.js";
import type { Product } from "@kutana/shared/catalog/model/product.js";
import { AppShell } from "./app-shell/components/AppShell.js";
import { TopBar } from "./app-shell/components/TopBar.js";
import type { ScreenId } from "./app-shell/screens.js";
import { useAuth } from "./composition/PortsProvider.js";
import { Button } from "./design-system/atoms/Button.js";
import { ButtonRow } from "./design-system/molecules/ButtonRow.js";
import { Panel } from "./design-system/molecules/Panel.js";
import { LoginPanel } from "./features/auth/components/LoginPanel.js";
import { CategoryManagementContainer } from "./features/catalog/containers/CategoryManagementContainer.js";
import { ProductFormContainer } from "./features/catalog/containers/ProductFormContainer.js";
import { InventoryListContainer } from "./features/inventory/containers/InventoryListContainer.js";
import { RegisterWorkspace } from "./features/ordering/components/RegisterWorkspace.js";
import { AddItemContainer } from "./features/ordering/containers/AddItemContainer.js";
import { NewOrderContainer } from "./features/ordering/containers/NewOrderContainer.js";
import { OrderTicketPanelContainer } from "./features/ordering/containers/OrderTicketPanelContainer.js";
import { OrdersOverviewContainer } from "./features/ordering/containers/OrdersOverviewContainer.js";
import { RegisterPaymentContainer } from "./features/register/containers/RegisterPaymentContainer.js";
import { SplitBillContainer } from "./features/split-bill/containers/SplitBillContainer.js";
import { PendingDebtsContainer } from "./features/pending-debts/containers/PendingDebtsContainer.js";
import { CustomerManagementContainer } from "./features/customers/containers/CustomerManagementContainer.js";

/** Center-column sub-state of the unified Register workspace. */
type CenterView = "account" | "payment" | "assignment";

/**
 * Root screen shell for the milestone-1 demo. Navigation state lives here;
 * layout chrome (top bar, optional bottom action bar) is provided by
 * <AppShell> and the app-shell components. Each screen below is a
 * container that wires its own ports.
 */
export function App(): JSX.Element {
  const auth = useAuth();
  const [session, setSession] = useState<AuthSession | null>(() => auth.currentSession());
  const [screen, setScreen] = useState<ScreenId>("inventory");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [centerView, setCenterView] = useState<CenterView>("account");
  const [ordersReloadKey, setOrdersReloadKey] = useState(0);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const resetCenter = (): void => {
    setCenterView("account");
    setSelectedTicketId(null);
    setSelectedAccountId(null);
  };

  const navigate = (next: ScreenId): void => {
    if (next === "register") resetCenter();
    setEditingProduct(null);
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
            personalAccountId={selectedAccountId ?? undefined}
            onPaymentComplete={resetCenter}
          />
          <Button variant="secondary" onClick={resetCenter}>
            Volver al pedido
          </Button>
        </>
      );
    } else if (centerView === "assignment") {
      center = (
        <>
          <SplitBillContainer
            tableId={selectedTableId}
            onPayAccount={(accountId) => {
              setSelectedTicketId(null);
              setSelectedAccountId(accountId);
              setCenterView("payment");
            }}
          />
          <Button variant="secondary" onClick={resetCenter}>
            Volver al pedido
          </Button>
        </>
      );
    } else {
      center = (
        <>
          <OrderTicketPanelContainer tableId={selectedTableId} />
          <ButtonRow>
            <Button variant="secondary" onClick={() => setCenterView("assignment")}>
              Administrar cuentas
            </Button>
            <Button
              onClick={() => {
                setSelectedTicketId(null);
                setSelectedAccountId(null);
                setCenterView("payment");
              }}
            >
              Cobrar saldo de mesa
            </Button>
          </ButtonRow>
        </>
      );
    }
  }

  if (!session) {
    return <LoginPanel onLogin={setSession} />;
  }

  return (
    <AppShell
      topBar={
        <TopBar
          currentScreen={screen}
          onNavigate={navigate}
          onLogout={() => {
            auth.logout();
            setSession(null);
            setScreen("inventory");
            setEditingProduct(null);
            resetCenter();
          }}
        />
      }
    >
      {screen === "inventory" ? (
        <InventoryListContainer
          onEditProduct={(product) => {
            setEditingProduct(product);
            setScreen("new-product");
          }}
        />
      ) : null}

      {screen === "new-product" ? (
        <Panel>
          <ProductFormContainer
            existingProduct={editingProduct ?? undefined}
            onSaved={() => {
              setEditingProduct(null);
              setScreen("inventory");
            }}
            onCancel={() => {
              setEditingProduct(null);
              setScreen("inventory");
            }}
          />
        </Panel>
      ) : null}

      {screen === "categories" ? <CategoryManagementContainer /> : null}

      {screen === "customers" ? <CustomerManagementContainer /> : null}

      {screen === "pending-debts" ? <PendingDebtsContainer /> : null}

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
          emptyCenter="Selecciona un pedido para ver sus cuentas a cobrar."
          railHidden={centerView !== "account"}
          rail={
            selectedTableId && centerView === "account" ? (
              <AddItemContainer tableId={selectedTableId} />
            ) : (
              <p>
                {selectedTableId
                  ? "Termina o sal del cobro para agregar más ítems."
                  : "Selecciona un pedido para agregar ítems."}
              </p>
            )
          }
        />
      ) : null}
    </AppShell>
  );
}
