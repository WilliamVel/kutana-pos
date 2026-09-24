import { useEffect, useState, type ReactNode } from "react";
import styles from "./RegisterWorkspace.module.css";

export interface RegisterWorkspaceProps {
  /** Left column: the open-orders list plus the "New order" control. */
  readonly list: ReactNode;
  /** Center column when a table is selected: the ticket / payment / split view. */
  readonly center: ReactNode | null;
  /** Center column when nothing is selected: a quiet empty state. */
  readonly emptyCenter: ReactNode;
  /** Right column: the "Quick add items" rail. */
  readonly rail: ReactNode;
  /**
   * When true, the right rail track is dropped entirely so the center
   * column is not starved by an idle column (payment / split sub-states).
   */
  readonly railHidden?: boolean;
  /** Allows secondary center content to extend beyond the fixed workspace card. */
  readonly centerOverflowVisible?: boolean;
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
  emptyCenter,
  rail,
  railHidden = false,
  centerOverflowVisible = false,
  selectedTableId = null,
}: RegisterWorkspaceProps): JSX.Element {
  const [mobileView, setMobileView] = useState<"order" | "products">("order");
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const workspaceClass = railHidden ? styles.workspaceFocused : styles.workspace;

  useEffect(() => {
    const onOrderUpdated = (event: Event): void => {
      const detail = (event as CustomEvent<{ orderId?: string; tableId?: string; orderCount?: number; productCount?: number }>).detail;
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

  return (
    <div className={workspaceClass} data-mobile-view={mobileView}>
      <div className={styles.mobileTabs} role="tablist" aria-label="Vista de la orden">
        <button type="button" role="tab" aria-selected={mobileView === "order"} onClick={() => setMobileView("order")}>
          <span aria-hidden="true">▤</span> Pedido {orderCount === null ? null : <strong>{orderCount}</strong>}
        </button>
        {!railHidden ? (
          <button type="button" role="tab" aria-selected={mobileView === "products"} onClick={() => setMobileView("products")}>
            <span aria-hidden="true">♧</span> Productos
          </button>
        ) : null}
      </div>
      <div className={styles.list}>{list}</div>
      {center ? (
        <div className={centerOverflowVisible ? `${styles.center} ${styles.centerOverflowVisible}` : styles.center}>{center}</div>
      ) : (
        <div className={styles.empty}>{emptyCenter}</div>
      )}
      {railHidden ? null : <div className={styles.rail}>{rail}</div>}
    </div>
  );
}
