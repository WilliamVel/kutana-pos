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
  readonly onRemoveEmptyOrder?: (tableId: string) => void;
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
  onRemoveEmptyOrder = () => {},
}: OrdersOverviewProps): JSX.Element {
  if (rows.length === 0) {
    return <p className={styles.empty}>No hay órdenes abiertas.</p>;
  }

  return (
    <div className={styles.list}>
      {rows.map((row) => (
        <div key={row.tableId} className={styles.row} data-selected={row.tableId === selectedTableId}>
          <button
            type="button"
            className={styles.rowMain}
            aria-pressed={row.tableId === selectedTableId}
            onClick={() => onSelectTable(row.tableId)}
          >
            <span>
              <strong>{row.tableLabel}</strong>
              <span className={styles.meta}>{row.itemCount} productos</span>
            </span>
            <StatusPill status={row.status} />
            <PriceTag cents={row.totalCents} />
          </button>
          {row.itemCount === 0 ? (
            <button
              type="button"
              className={styles.removeButton}
              aria-label={`Eliminar orden vacía de ${row.tableLabel}`}
              onClick={() => onRemoveEmptyOrder(row.tableId)}
            >
              ×
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
