import { Button } from "../../../design-system/atoms/Button.js";
import { PriceTag } from "../../../design-system/molecules/PriceTag.js";
import styles from "./BillPanel.module.css";

export interface SplitBillLine {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
  /** Integer cents. */
  readonly totalCents: number;
}

export interface BillPanelProps {
  readonly title: string;
  readonly lines: readonly SplitBillLine[];
  /** Integer cents — MUST come from `ticketTotals`, never recomputed here. */
  readonly totalCents: number;
  readonly moveButtonLabel: string;
  readonly onMoveItem: (lineItemId: string) => void;
  readonly emptyMessage: string;
  readonly disabled?: boolean;
}

/**
 * Purely presentational: props in, markup out, no port access. A single
 * bill panel (used as both "Original Bill" and "New Bill" via the two thin
 * wrappers below). Renders whichever LineItems are CURRENTLY allocated to
 * this side and a button to move each one to the other side — "moving" is
 * always the container's job (repointing an Allocation via
 * `splitAllocation`), never something this component decides on its own.
 */
export function BillPanel({
  title,
  lines,
  totalCents,
  moveButtonLabel,
  onMoveItem,
  emptyMessage,
  disabled = false,
}: BillPanelProps): JSX.Element {
  return (
    <section className={styles.panel} role="region" aria-label={title}>
      <h2>{title}</h2>

      {lines.length === 0 ? (
        <p className={styles.empty}>{emptyMessage}</p>
      ) : (
        <ul className={styles.lines}>
          {lines.map((line) => (
            <li key={line.id} className={styles.line}>
              <div className={styles.details}>
                <span className={styles.name}>{line.name}</span>
                <span className={styles.quantity}>x{line.quantity}</span>
              </div>
              <PriceTag cents={line.totalCents} />
              <Button variant="secondary" disabled={disabled} onClick={() => onMoveItem(line.id)}>
                {moveButtonLabel}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.totalRow}>
        <span>Total</span>
        <PriceTag cents={totalCents} />
      </div>
    </section>
  );
}
