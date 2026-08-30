import type { PourSize } from "@kutana/shared/catalog/model/product.js";
import { LineItemRow } from "../../../design-system/molecules/LineItemRow.js";
import { PriceTag } from "../../../design-system/molecules/PriceTag.js";
import { StatusPill, type OrderStatus } from "../../../design-system/molecules/StatusPill.js";
import styles from "./OrderTicketPanel.module.css";

export interface OrderTicketPanelLine {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
  /** Integer cents. */
  readonly unitPriceCents: number;
  /** Integer cents. */
  readonly totalCents: number;
  readonly pourSizeMl: PourSize | null;
  readonly isAdjustment: boolean;
}

export interface OrderTicketPanelProps {
  readonly tableLabel: string;
  readonly status: OrderStatus;
  readonly lines: readonly OrderTicketPanelLine[];
  /** Integer cents — sum of line item subtotals (pre-tax). */
  readonly subtotalCents: number;
  /**
   * Integer cents — the SUM of each line item's persisted at-sale-time tax
   * (see `LineItem.taxCents`), never recomputed from the current catalog
   * tax rate. A later catalog rate change must not alter an already-sold
   * line's tax (spec: "Tax Persisted at Sale Time").
   */
  readonly taxCents: number;
  /** Integer cents. */
  readonly totalCents: number;
}

/**
 * Purely presentational: props in, markup out, no port access. Renders one
 * table's active order as a single ticket (bill splitting into multiple
 * tickets is PR7's split-bill screen — out of this PR's scope).
 */
export function OrderTicketPanel({
  tableLabel,
  status,
  lines,
  subtotalCents,
  taxCents,
  totalCents,
}: OrderTicketPanelProps): JSX.Element {
  return (
    <section className={styles.panel} aria-label={`Ticket for ${tableLabel}`}>
      <div className={styles.header}>
        <h2>{tableLabel}</h2>
        <StatusPill status={status} />
      </div>

      {lines.length === 0 ? (
        <p className={styles.empty}>No items on this ticket yet.</p>
      ) : (
        <div className={styles.lines}>
          {lines.map((line) => (
            <LineItemRow
              key={line.id}
              name={line.name}
              quantity={line.quantity}
              unitPriceCents={line.unitPriceCents}
              totalCents={line.totalCents}
              pourSizeMl={line.pourSizeMl}
              isAdjustment={line.isAdjustment}
            />
          ))}
        </div>
      )}

      <div className={styles.totals}>
        <div className={styles.totalRow}>
          <span>Subtotal</span>
          <PriceTag cents={subtotalCents} />
        </div>
        <div className={styles.totalRow}>
          <span>Tax</span>
          <PriceTag cents={taxCents} />
        </div>
        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
          <span>Total</span>
          <PriceTag cents={totalCents} />
        </div>
      </div>
    </section>
  );
}
