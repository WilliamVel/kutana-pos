import styles from "./StatusPill.module.css";

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock" | "no-stock-control";
export type OrderStatus = "active" | "needs-check" | "in-review" | "paid" | "closed-with-pending";

export interface StatusPillProps {
  readonly status: StockStatus | OrderStatus;
}

const LABELS_BY_STATUS: Record<StockStatus | OrderStatus, string> = {
  "in-stock": "Con stock",
  "low-stock": "Stock bajo",
  "out-of-stock": "Sin stock",
  "no-stock-control": "Sin control",
  active: "Activa",
  "needs-check": "Requiere revisión",
  "in-review": "En revisión",
  paid: "Pagada",
  "closed-with-pending": "Cerrada con deuda",
};

// `noUncheckedIndexedAccess` widens CSS-module class lookups to
// `string | undefined`; these keys are fixed and always present in
// StatusPill.module.css, so the non-null assertion here is safe.
const CLASS_BY_STATUS: Record<StockStatus | OrderStatus, string> = {
  "in-stock": styles.inStock!,
  "low-stock": styles.lowStock!,
  "out-of-stock": styles.outOfStock!,
  "no-stock-control": styles.needsCheck!,
  active: styles.active!,
  "needs-check": styles.needsCheck!,
  "in-review": styles.needsCheck!,
  paid: styles.paid!,
  "closed-with-pending": styles.needsCheck!,
};

/**
 * Purely presentational molecule: props in, markup out, no port access.
 * Covers both stock states (in-stock/low-stock/out-of-stock) and order
 * states (active/needs-check/paid) with one component, since both are
 * "a labeled state pill" and share the same role-token status palette.
 */
export function StatusPill({ status }: StatusPillProps): JSX.Element {
  return (
    <span className={`${styles.pill} ${CLASS_BY_STATUS[status]}`} data-status={status}>
      {LABELS_BY_STATUS[status]}
    </span>
  );
}
