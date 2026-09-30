import { useEffect, useState, type ReactNode } from "react";
import styles from "./RegisterWorkspace.module.css";

export interface RegisterWorkspaceProps {
  /** Left column: the open-orders list plus the "New order" control. */
  readonly list: ReactNode;
  /** Center column when a table is selected: the ticket / payment / split view. */
  readonly center: ReactNode | null;
  /** Actions below the selected order, laid out by the workspace rather than its caller. */
  readonly actions?: ReactNode;
  /** Center column when nothing is selected: a quiet empty state. */
  readonly emptyCenter: ReactNode;
  /** Right column: the "Quick add items" rail. */
  readonly rail: ReactNode;
  /** Empty-state copy used to keep the products panel complete before selection. */
  readonly emptyRailTitle?: string;
  readonly emptyRailMessage?: ReactNode;
  /**
   * When true, the right rail track is dropped entirely so the center
   * column is not starved by an idle column (payment / split sub-states).
   */
  readonly railHidden?: boolean;
  /** Allows secondary center content to extend beyond the fixed workspace card. */
  readonly centerOverflowVisible?: boolean;
  /** Fullscreen flow rendered above the workspace rather than inside its center column. */
  readonly overlay?: ReactNode;
  readonly overlayTitle?: string;
  readonly onCloseOverlay?: () => void;
  readonly listLocked?: boolean;
  readonly selectedTableId?: string | null;
}

/**
 * Purely presentational three-column layout for the unified Register
 * workspace: a fixed-width open-orders list on the left, the selected
 * order's working area in the elevated center card, and the quick-add
 * items rail on the right. Props in, markup out — no port access. Stacks
 * to a single column on narrow widths.
 */
export function RegisterWorkspace({
  list,
  center,
  actions,
  emptyCenter,
  rail,
  emptyRailTitle,
  emptyRailMessage,
  railHidden = false,
  centerOverflowVisible = false,
  overlay = null,
  overlayTitle = "Flujo activo",
  onCloseOverlay,
  listLocked = false,
  selectedTableId = null,
}: RegisterWorkspaceProps): JSX.Element {
  const [mobileView, setMobileView] = useState<"order" | "products">("order");
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const workspaceClass = railHidden ? styles.workspaceFocused : styles.workspace;

  useEffect(() => {
    const onOrderUpdated = (event: Event): void => {
      const detail = (
        event as CustomEvent<{
          orderId?: string;
          tableId?: string;
          orderCount?: number;
          productCount?: number;
        }>
      ).detail;
      if (detail.tableId !== selectedTableId) return;
      if (typeof detail.orderCount === "number") setOrderCount(detail.orderCount);
    };
    const onProductsRequested = (): void => setMobileView("products");
    window.addEventListener("kutana.order.updated", onOrderUpdated);
    window.addEventListener("kutana.mobile.products", onProductsRequested);
    return () => {
      window.removeEventListener("kutana.order.updated", onOrderUpdated);
      window.removeEventListener("kutana.mobile.products", onProductsRequested);
    };
  }, [selectedTableId]);

  useEffect(() => {
    setOrderCount(null);
  }, [selectedTableId]);

  useEffect(() => {
    if (!overlay) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [overlay]);

  useEffect(() => {
    if (!overlay || !onCloseOverlay) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      const target = event.target;
      // Let split-flow confirmations and popovers consume Escape first.
      if (target instanceof HTMLElement && target.closest('[role="dialog"][aria-labelledby]'))
        return;
      event.preventDefault();
      onCloseOverlay();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCloseOverlay, overlay]);

  return (
    <div className={workspaceClass} data-mobile-view={mobileView}>
      <div className={styles.mobileTabs} role="tablist" aria-label="Vista de la orden">
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === "order"}
          onClick={() => setMobileView("order")}
        >
          <span aria-hidden="true">▤</span> Pedido{" "}
          {orderCount === null ? null : <strong>{orderCount}</strong>}
        </button>
        {!railHidden ? (
          <button
            type="button"
            role="tab"
            aria-selected={mobileView === "products"}
            onClick={() => setMobileView("products")}
          >
            <span aria-hidden="true">♧</span> Productos
          </button>
        ) : null}
      </div>
      <div
        className={listLocked ? `${styles.list} ${styles.listLocked}` : styles.list}
        aria-disabled={listLocked}
      >
        <div className={styles.listContent}>{list}</div>
      </div>
      {center ? (
        <div
          className={
            centerOverflowVisible
              ? `${styles.center} ${styles.centerOverflowVisible}`
              : styles.center
          }
        >
          {center}
          {actions ? <div className={styles.centerActions}>{actions}</div> : null}
        </div>
      ) : (
        <div className={styles.center}>
          <div className={styles.empty}>{emptyCenter}</div>
        </div>
      )}
      {railHidden ? null : (
        <div className={styles.rail}>
          {!selectedTableId && emptyRailTitle ? (
            <section className={styles.emptyPanel} aria-label={emptyRailTitle}>
              <h2>{emptyRailTitle}</h2>
              {emptyRailMessage ? <p className={styles.emptyMessage}>{emptyRailMessage}</p> : null}
            </section>
          ) : (
            rail
          )}
        </div>
      )}
      {overlay ? (
        <div className={styles.overlayBackdrop} role="presentation">
          <section
            className={styles.overlayPanel}
            role="dialog"
            aria-modal="true"
            aria-label={overlayTitle}
          >
            <header className={styles.overlayHeader}>
              <h2>{overlayTitle}</h2>
              {onCloseOverlay ? (
                <button
                  type="button"
                  className={styles.overlayClose}
                  aria-label="Cerrar división de cuenta"
                  onClick={onCloseOverlay}
                >
                  ×
                </button>
              ) : null}
            </header>
            <div className={styles.overlayContent}>{overlay}</div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
