import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { AuthSession } from "@kutana/shared/auth/model/auth-session.js";
import type { Product } from "@kutana/shared/catalog/model/product.js";
import { AppShell } from "./app-shell/components/AppShell.js";
import { TopBar } from "./app-shell/components/TopBar.js";
import { screenFromPath, screenPath, type ScreenId } from "./app-shell/screens.js";
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
import workspaceStyles from "./features/ordering/components/RegisterWorkspace.module.css";
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
 * Root screen shell for the milestone-1 demo. Top-level navigation is backed by
 * the browser URL; workspace state lives here. Layout chrome (top bar, optional
 * bottom action bar) is provided by <AppShell> and the app-shell components.
 */
export function App(): JSX.Element {
  const auth = useAuth();
  const [session, setSession] = useState<AuthSession | null>(() => auth.currentSession());
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const location = useLocation();
  const navigateRouter = useNavigate();
  const requestedScreen = screenFromPath(location.pathname);
  const screen =
    session && !canAccessScreen(requestedScreen, session.role) ? "register" : requestedScreen;
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
  const splitMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const splitMenuRef = useRef<HTMLDivElement>(null);
  const [splitMenuPosition, setSplitMenuPosition] = useState({ top: 0, left: 0 });
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

  const closeProductSelection = (): void => {
    setProductSelectionMode(false);
    setSelectedProductLines([]);
    resetCenter();
  };

  useEffect(() => {
    if (!splitMenuOpen) return;
    const trigger = splitMenuTriggerRef.current;
    const updatePosition = (): void => {
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const gap = 8;
      const viewportPadding = 16;
      const menuHeight = Math.min(
        splitMenuRef.current?.getBoundingClientRect().height ?? 352,
        window.innerHeight - viewportPadding * 2,
      );
      const below = rect.bottom + gap;
      const above = rect.top - menuHeight - gap;
      const fitsBelow = below + menuHeight <= window.innerHeight - viewportPadding;
      const fitsAbove = above >= viewportPadding;
      const top = fitsBelow || !fitsAbove ? Math.max(viewportPadding, below) : above;
      setSplitMenuPosition({
        top,
        left: Math.max(16, Math.min(rect.right - 240, window.innerWidth - 256)),
      });
    };
    updatePosition();
    splitMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const onPointerDown = (event: PointerEvent): void => {
      if (
        !splitMenuRef.current?.contains(event.target as Node) &&
        !trigger?.contains(event.target as Node)
      )
        setSplitMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSplitMenuOpen(false);
        trigger?.focus();
      }
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [splitMenuOpen]);

  useEffect(() => {
    if (location.pathname === "/") {
      navigateRouter(screenPath("register"), { replace: true });
    }
  }, [location.pathname, navigateRouter]);

  useEffect(() => {
    if (!session && location.pathname !== "/login") {
      navigateRouter("/login", { replace: true });
    }
  }, [location.pathname, navigateRouter, session]);

  useEffect(() => {
    if (session && !canAccessScreen(requestedScreen, session.role)) {
      navigateRouter(screenPath("register"), { replace: true });
    }
  }, [navigateRouter, requestedScreen, session]);

  useEffect(() => {
    const expireSession = (): void => {
      setSession(null);
      setLoginNotice("Tu sesión expiró. Iniciá sesión nuevamente.");
      navigateRouter("/login", { replace: true });
      setEditingProduct(null);
      resetCenter();
    };

    window.addEventListener("kutana.auth.session-expired", expireSession);
    return () => window.removeEventListener("kutana.auth.session-expired", expireSession);
  }, []);

  const navigate = (next: ScreenId): void => {
    if (!session) return;
    if (!canAccessScreen(next, session.role)) return;
    setProductSelectionMode(false);
    setSelectedProductLines([]);
    if (next === "register") {
      resetCenter();
      setSelectedOrderReady(false);
      setSelectedOrderListReady(false);
    } else {
      // Keep the table selection for a possible return to Orders, but reset
      // the center sub-view so a split overlay cannot reopen stale.
      resetCenter();
      setSelectedOrderReady(false);
      setSelectedOrderListReady(false);
    }
    setEditingProduct(null);
    navigateRouter(screenPath(next));
  };

  const selectTable = (tableId: string): void => {
    setSelectedTableId(tableId);
    setSelectedOrderReady(false);
    setSelectedOrderListReady(false);
    resetCenter();
  };

  let center: JSX.Element | null = null;
  let centerActions: JSX.Element | null = null;
  let splitOverlay: JSX.Element | null = null;
  const renderOrderTicketPanel = (selectionMode: boolean): JSX.Element => (
    <OrderTicketPanelContainer
      key={`${selectedTableId}:${selectedOrderId ?? ""}:${selectionMode ? "selection" : "account"}`}
      tableId={selectedTableId!}
      selectionMode={selectionMode}
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
            onPaymentRecorded={() => {
              // A partial payment keeps the order active. Return to its main
              // order view instead of leaving the operator in checkout.
              setSelectedProductLines([]);
              setProductSelectionMode(false);
              resetCenter();
              setOrdersReloadKey((key) => key + 1);
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
      splitOverlay = (
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
      );
    } else if (productSelectionMode) {
      splitOverlay = renderOrderTicketPanel(true);
    } else {
      center = renderOrderTicketPanel(false);
      centerActions = (
        <ButtonRow>
          {selectedOrderReady && selectedOrderListReady ? (
            <div className={workspaceStyles.splitMenuWrap}>
              <Button
                buttonRef={splitMenuTriggerRef}
                variant="secondary"
                ariaLabel="Dividir cuenta"
                ariaExpanded={splitMenuOpen}
                ariaControls="split-payment-menu"
                onClick={() => setSplitMenuOpen((open) => !open)}
              >
                <Icon name="split" size={22} />
                Dividir
              </Button>
              {splitMenuOpen ? (
                <>
                  <div className={workspaceStyles.splitMenuBackdrop} aria-hidden="true" />
                  <div
                    ref={splitMenuRef}
                    id="split-payment-menu"
                    className={workspaceStyles.splitMenu}
                    role="menu"
                    aria-label="Opciones para dividir"
                    style={{ top: splitMenuPosition.top, left: splitMenuPosition.left }}
                  >
                    <div className={workspaceStyles.splitMenuHeader}>
                      <div>
                        <strong>Dividir cuenta</strong>
                        <span>Elegí cómo cobrarla</span>
                      </div>
                      <button
                        type="button"
                        className={workspaceStyles.splitMenuClose}
                        aria-label="Cerrar opciones para dividir"
                        onClick={() => {
                          setSplitMenuOpen(false);
                          splitMenuTriggerRef.current?.focus();
                        }}
                      >
                        ×
                      </button>
                    </div>
                    <button
                      className={workspaceStyles.splitMenuAction}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProductSelectionMode(true);
                        setSplitMenuOpen(false);
                        splitMenuTriggerRef.current?.focus();
                      }}
                    >
                      <strong>Cobrar productos</strong>
                      <span>Seleccioná unidades concretas de la orden</span>
                    </button>
                    <button
                      className={workspaceStyles.splitMenuAction}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setCenterView("assignment");
                        setSplitMenuOpen(false);
                        splitMenuTriggerRef.current?.focus();
                      }}
                    >
                      <strong>Partes iguales</strong>
                      <span>Distribuí el total entre personas</span>
                    </button>
                    <button
                      className={workspaceStyles.splitMenuAction}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setCenterView("assignment");
                        setSplitMenuOpen(false);
                        splitMenuTriggerRef.current?.focus();
                      }}
                    >
                      <strong>Por monto</strong>
                      <span>Asigná un importe específico</span>
                    </button>
                  </div>
                </>
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
          navigateRouter(screenPath("register"), { replace: true, state: null });
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
            navigateRouter("/login", { replace: true });
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
            navigateRouter("/products/new");
          }}
          onManageCategories={() => navigateRouter("/categories")}
          onEditProduct={(product) => {
            setEditingProduct(product);
            navigateRouter("/products/new");
          }}
        />
      ) : null}

      {screen === "new-product" ? (
        <Panel>
          <ProductFormContainer
            existingProduct={editingProduct ?? undefined}
            onSaved={() => {
              setEditingProduct(null);
              navigateRouter(screenPath("inventory"));
            }}
            onCancel={() => {
              setEditingProduct(null);
              navigateRouter(screenPath("inventory"));
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
                onSelectTable={(tableId) => {
                  if (centerView === "assignment") return;
                  selectTable(tableId);
                }}
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
          centerOverflowVisible={false}
          overlay={splitOverlay}
          overlayTitle={
            productSelectionMode ? "Seleccionar productos para cobrar" : "Dividir cuenta"
          }
          onCloseOverlay={productSelectionMode ? closeProductSelection : resetCenter}
          listLocked={centerView === "assignment" || productSelectionMode}
          railHidden={
            Boolean(selectedTableId) && (centerView !== "account" || productSelectionMode)
          }
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
