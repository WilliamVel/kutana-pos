import { useEffect, useState } from "react";
import type { AuthSession } from "@kutana/shared/auth/model/auth-session.js";
import type { Product } from "@kutana/shared/catalog/model/product.js";
import { AppShell } from "./app-shell/components/AppShell.js";
import { TopBar } from "./app-shell/components/TopBar.js";
import type { ScreenId } from "./app-shell/screens.js";
import { useAuth } from "./composition/PortsProvider.js";
import { Button } from "./design-system/atoms/Button.js";
import { Icon } from "./design-system/atoms/Icon.js";
import { ButtonRow } from "./design-system/molecules/ButtonRow.js";
import { Panel } from "./design-system/molecules/Panel.js";
import { ChangePinPanel } from "./features/auth/components/ChangePinPanel.js";
import { LoginPanel } from "./features/auth/components/LoginPanel.js";
import { CategoryManagementContainer } from "./features/catalog/containers/CategoryManagementContainer.js";
import { ProductFormContainer } from "./features/catalog/containers/ProductFormContainer.js";
import { InventoryListContainer } from "./features/inventory/containers/InventoryListContainer.js";
import { RegisterWorkspace } from "./features/ordering/components/RegisterWorkspace.js";
import { AddItemContainer } from "./features/ordering/containers/AddItemContainer.js";
import { NewOrderContainer } from "./features/ordering/containers/NewOrderContainer.js";
import { OrderTicketPanelContainer } from "./features/ordering/containers/OrderTicketPanelContainer.js";
import type { SelectedProductLine } from "./features/ordering/components/OrderTicketPanel.js";
import { OrdersOverviewContainer } from "./features/ordering/containers/OrdersOverviewContainer.js";
import { RegisterPaymentContainer } from "./features/register/containers/RegisterPaymentContainer.js";
import { SplitBillContainer } from "./features/split-bill/containers/SplitBillContainer.js";
import { PendingDebtsContainer } from "./features/pending-debts/containers/PendingDebtsContainer.js";
import { CustomerManagementContainer } from "./features/customers/containers/CustomerManagementContainer.js";
import { UserManagementContainer } from "./features/users/containers/UserManagementContainer.js";
import { AnalyticsScreen } from "./features/analytics/AnalyticsScreen.js";
import { canAccessScreen } from "./app-shell/screens.js";
import { toast } from "sonner";

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
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [screen, setScreen] = useState<ScreenId>("register");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderReady, setSelectedOrderReady] = useState(false);
  const [selectedOrderListReady, setSelectedOrderListReady] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [centerView, setCenterView] = useState<CenterView>("account");
  const [splitMenuOpen, setSplitMenuOpen] = useState(false);
  const [productSelectionMode, setProductSelectionMode] = useState(false);
  const [selectedProductLines, setSelectedProductLines] = useState<SelectedProductLine[]>([]);
  const [ordersReloadKey, setOrdersReloadKey] = useState(0);
  const [newOrderRequest, setNewOrderRequest] = useState(0);
  const [pendingCreatedTableId, setPendingCreatedTableId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);

  const resetCenter = (): void => {
    setSelectedOrderId(null);
    setCenterView("account");
    setSelectedTicketId(null);
    setSelectedAccountId(null);
  };

  useEffect(() => {
    const expireSession = (): void => {
      setSession(null);
      setLoginNotice("Tu sesión expiró. Iniciá sesión nuevamente.");
      setScreen("inventory");
      setEditingProduct(null);
      resetCenter();
    };

    window.addEventListener("kutana.auth.session-expired", expireSession);
    return () => window.removeEventListener("kutana.auth.session-expired", expireSession);
  }, []);

  const navigate = (next: ScreenId): void => {
    if (!session) return;
    if (!canAccessScreen(next, session.role)) return;
    if (next === "register") {
      resetCenter();
      setSelectedOrderReady(false);
      setSelectedOrderListReady(false);
    } else {
      // Keep the table selection for a possible return to Orders, but require
      // the Orders container to validate it again before showing actions.
      setSelectedOrderReady(false);
      setSelectedOrderListReady(false);
    }
    setEditingProduct(null);
    setScreen(next);
  };

  const selectTable = (tableId: string): void => {
    setSelectedTableId(tableId);
    setSelectedOrderReady(false);
    setSelectedOrderListReady(false);
    resetCenter();
  };

  let center: JSX.Element | null = null;
  let centerActions: JSX.Element | null = null;
  if (selectedTableId) {
    if (centerView === "payment") {
      center = (
        <>
          <RegisterPaymentContainer
            tableId={selectedTableId}
            selectedProductLines={
              selectedProductLines.length > 0 ? selectedProductLines : undefined
            }
            ticketId={selectedTicketId ?? undefined}
            personalAccountId={selectedAccountId ?? undefined}
            onBack={() => {
              if (selectedProductLines.length > 0) setProductSelectionMode(true);
              resetCenter();
            }}
            onReviewPayment={() => {
              setSelectedTicketId(null);
              setSelectedAccountId(null);
              setCenterView("assignment");
            }}
            onWholeTableClosed={(tableId) => {
              toast.success("Pago registrado · Mesa cerrada", {
                id: `payment-registered-table-closed-${tableId}`,
              });
            }}
            onPaymentComplete={() => {
              setSelectedProductLines([]);
              setProductSelectionMode(false);
              resetCenter();
              setSelectedTableId(null);
              setOrdersReloadKey((key) => key + 1);
            }}
          />
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
            onPayOrder={() => {
              setSelectedTicketId(null);
              setSelectedAccountId(null);
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
        <OrderTicketPanelContainer
          key={`${selectedTableId}:${selectedOrderId ?? ""}`}
          tableId={selectedTableId}
          selectionMode={productSelectionMode}
          selectedProducts={selectedProductLines}
          onSelectionChange={(selection) => setSelectedProductLines([...selection])}
          onReviewSelectedProducts={(selection) => {
            setSelectedProductLines([...selection]);
            setProductSelectionMode(false);
            setCenterView("payment");
          }}
          onLoadStateChange={(state) => setSelectedOrderReady(state === "ready")}
        />
      );
      centerActions = (
        <ButtonRow>
          {selectedOrderReady && selectedOrderListReady ? (
            <div style={{ position: "relative" }}>
              <Button
                variant="secondary"
                ariaLabel="Dividir cuenta"
                onClick={() => setSplitMenuOpen((open) => !open)}
              >
                <Icon name="split" size={22} />
                Dividir
              </Button>
              {splitMenuOpen ? (
                <div
                  role="menu"
                  aria-label="Opciones para dividir"
                  style={{
                    position: "absolute",
                    zIndex: 3,
                    right: 0,
                    bottom: "calc(100% + .5rem)",
                    display: "flex",
                    minWidth: "13rem",
                    flexDirection: "column",
                    gap: ".25rem",
                    padding: ".5rem",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: ".6rem",
                    background: "var(--surface-raised)",
                    boxShadow: "var(--shadow-lg)",
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProductSelectionMode(true);
                      setSplitMenuOpen(false);
                    }}
                  >
                    Cobrar productos
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setCenterView("assignment");
                      setSplitMenuOpen(false);
                    }}
                  >
                    Partes iguales
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setCenterView("assignment");
                      setSplitMenuOpen(false);
                    }}
                  >
                    Por monto
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          {selectedOrderReady && selectedOrderListReady ? (
            <Button
              ariaLabel="Pagar mesa completa"
              onClick={() => {
                setSelectedTicketId(null);
                setSelectedAccountId(null);
                setCenterView("payment");
              }}
            >
              <Icon name="cash" size={22} />
              Pagar
            </Button>
          ) : null}
        </ButtonRow>
      );
    }
  }

  if (!session) {
    return (
      <LoginPanel
        notice={loginNotice}
        onLogin={(nextSession) => {
          setLoginNotice(null);
          setSession(nextSession);
        }}
      />
    );
  }

  return (
    <AppShell
      topBar={
        <TopBar
          currentScreen={screen}
          session={session}
          onNavigate={navigate}
          onChangePin={() => setIsChangePinOpen(true)}
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
          onAddProduct={() => {
            setEditingProduct(null);
            setScreen("new-product");
          }}
          onManageCategories={() => setScreen("categories")}
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

      {screen === "users" && session.role === "admin" ? <UserManagementContainer /> : null}

      {screen === "analytics" && session.role === "admin" ? <AnalyticsScreen /> : null}

      {isChangePinOpen ? <ChangePinPanel onDone={() => setIsChangePinOpen(false)} /> : null}

      {screen === "register" ? (
        <RegisterWorkspace
          list={
            <>
              <OrdersOverviewContainer
                newOrder={
                  <NewOrderContainer
                    reloadKey={ordersReloadKey}
                    openRequest={newOrderRequest}
                    onCreated={(tableId, orderId) => {
                      toast.success("Orden creada", {
                        id: `order-created-${orderId}`,
                        duration: 4200,
                      });
                      setSelectedOrderId(orderId);
                      // Keep this selection alive while the refreshed list catches up.
                      // The list is keyed by table, while the API's saved order ID is
                      // published by NewOrderContainer through OrderEvents.
                      setPendingCreatedTableId(tableId);
                      selectTable(tableId);
                      window.dispatchEvent(new CustomEvent("kutana.mobile.products"));
                      setOrdersReloadKey((key) => key + 1);
                    }}
                  />
                }
                selectedTableId={selectedTableId}
                onSelectTable={selectTable}
                onSelectionStateChange={(state) => {
                  if (state === "valid") {
                    setSelectedOrderListReady(true);
                    setPendingCreatedTableId(null);
                    return;
                  }
                  setSelectedOrderListReady(false);
                  // A just-created order is not in the previous snapshot yet. Do
                  // not let that transient invalid state clear the new workspace.
                  if (
                    state === "invalid" &&
                    selectedTableId &&
                    selectedTableId !== pendingCreatedTableId
                  ) {
                    setSelectedTableId(null);
                    setSelectedOrderReady(false);
                    resetCenter();
                  }
                }}
                onNewOrder={() => setNewOrderRequest((request) => request + 1)}
                onOrderRemoved={() => {
                  resetCenter();
                  setSelectedTableId(null);
                  setSelectedOrderReady(false);
                  setSelectedOrderListReady(false);
                  setOrdersReloadKey((key) => key + 1);
                }}
                reloadKey={ordersReloadKey}
              />
            </>
          }
          center={center}
          actions={centerActions}
          emptyCenter={
            <>
              <h2>Cuentas</h2>
              <p>Selecciona una orden para ver sus cuentas</p>
            </>
          }
          emptyRailTitle="Productos"
          emptyRailMessage="Selecciona una orden para agregar productos"
          centerOverflowVisible={centerView === "assignment"}
          railHidden={Boolean(selectedTableId) && centerView !== "account"}
          selectedTableId={selectedTableId}
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
