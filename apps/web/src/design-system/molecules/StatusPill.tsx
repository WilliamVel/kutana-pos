import styles from "./StatusPill.module.css";

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";
export type OrderStatus = "active" | "needs-check" | "paid";

export interface StatusPillProps {
  readonly status: StockStatus | OrderStatus;
}

const LABELS_BY_STATUS: Record<StockStatus | OrderStatus, string> = {
  "in-stock": "In stock",
  "low-stock": "Low stock",
  "out-of-stock": "Out of stock",
  active: "Active",
  "needs-check": "Needs check",
  paid: "Paid",
};

// `noUncheckedIndexedAccess` widens CSS-module class lookups to
// `string | undefined`; these keys are fixed and always present in
// StatusPill.module.css, so the non-null assertion here is safe.
const CLASS_BY_STATUS: Record<StockStatus | OrderStatus, string> = {
  "in-stock": styles.inStock!,
  "low-stock": styles.lowStock!,
  "out-of-stock": styles.outOfStock!,
  active: styles.active!,
  "needs-check": styles.needsCheck!,
  paid: styles.paid!,
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
