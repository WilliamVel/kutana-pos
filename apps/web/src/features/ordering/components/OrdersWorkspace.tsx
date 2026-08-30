import type { ReactNode } from "react";
import styles from "./OrdersWorkspace.module.css";

export interface OrdersWorkspaceProps {
  /** Left column: the all-orders list plus the "New order" control. */
  readonly list: ReactNode;
  /** Right column when a table is selected: ticket + add-items panels. */
  readonly detail: ReactNode | null;
  /** Right column when nothing is selected: a quiet empty state. */
  readonly emptyDetail: ReactNode;
}

/**
 * Purely presentational master-detail layout for the Orders screen: a
 * fixed-width list column on the left and a detail card on the right. The
 * detail card carries the elevation (`--shadow-md`, `--radius-lg`) so the
 * right side reads as a panel. Stacks to a single column on narrow widths.
 * Props in, markup out — no port access.
 */
export function OrdersWorkspace({
  list,
  detail,
  emptyDetail,
}: OrdersWorkspaceProps): JSX.Element {
  return (
    <div className={styles.workspace}>
      <div className={styles.list}>{list}</div>
      {detail ? (
        <div className={styles.detail}>{detail}</div>
      ) : (
        <div className={styles.empty}>{emptyDetail}</div>
      )}
    </div>
  );
}
