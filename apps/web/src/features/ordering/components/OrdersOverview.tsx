import type { OrderStatus } from "../../../design-system/molecules/StatusPill.js";
import { PriceTag } from "../../../design-system/molecules/PriceTag.js";
import { StatusPill } from "../../../design-system/molecules/StatusPill.js";
import styles from "./OrdersOverview.module.css";

export interface OrdersOverviewRow {
  readonly tableId: string;
  readonly tableLabel: string;
  readonly status: OrderStatus;
  readonly itemCount: number;
  /** Integer cents. */
  readonly totalCents: number;
  readonly openedAt: string;
}

export interface OrdersOverviewProps {
  readonly rows: readonly OrdersOverviewRow[];
  readonly selectedTableId: string | null;
  readonly onSelectTable: (tableId: string) => void;
}

/**
 * Purely presentational: props in, markup out, no port access, no
 * `OrderEvents` subscription — realtime updates are the container's job
 * (`OrdersOverviewContainer`), which re-renders this component with fresh
 * rows whenever the mock `OrderEvents` emitter fires.
 */
export function OrdersOverview({
  rows,
  selectedTableId,
  onSelectTable,
}: OrdersOverviewProps): JSX.Element {
  if (rows.length === 0) {
    return <p className={styles.empty}>No open orders.</p>;
  }

  return (
    <div className={styles.list}>
      {rows.map((row) => (
        <button
          key={row.tableId}
          type="button"
          className={styles.row}
          aria-pressed={row.tableId === selectedTableId}
          onClick={() => onSelectTable(row.tableId)}
        >
          <span>
            <strong>{row.tableLabel}</strong>
            <div className={styles.meta}>{row.itemCount} items</div>
          </span>
          <StatusPill status={row.status} />
          <PriceTag cents={row.totalCents} />
        </button>
      ))}
    </div>
  );
}
