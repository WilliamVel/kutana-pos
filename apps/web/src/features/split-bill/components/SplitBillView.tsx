import { BillPanel, type SplitBillLine } from "./BillPanel.js";
import styles from "./SplitBillView.module.css";

export type { SplitBillLine };

export interface SplitBillViewProps {
  readonly originalLines: readonly SplitBillLine[];
  readonly newLines: readonly SplitBillLine[];
  /** Integer cents — MUST come from `ticketTotals`, never recomputed here. */
  readonly originalTotalCents: number;
  /** Integer cents — MUST come from `ticketTotals`, never recomputed here. */
  readonly newTotalCents: number;
  readonly onMoveToNew: (lineItemId: string) => void;
  readonly onMoveToOriginal: (lineItemId: string) => void;
  /** Disables every move button — used while a conflict is being resolved. */
  readonly disabled?: boolean;
}

/**
 * The split-bill screen's core view: two side-by-side panels, "Original
 * Bill" and "New Bill". "Moving" an item between them is never a copy or a
 * LineItem mutation — the container repoints the item's Allocation
 * (`splitAllocation`) and re-renders this component with the new grouping.
 * Purely presentational: props in, markup out, no port access.
 */
export function SplitBillView({
  originalLines,
  newLines,
  originalTotalCents,
  newTotalCents,
  onMoveToNew,
  onMoveToOriginal,
  disabled = false,
}: SplitBillViewProps): JSX.Element {
  return (
    <div className={styles.grid}>
      <BillPanel
        title="Original Bill"
        lines={originalLines}
        totalCents={originalTotalCents}
        moveButtonLabel="Move to New Bill"
        emptyMessage="No items on this bill."
        onMoveItem={onMoveToNew}
        disabled={disabled}
      />
      <BillPanel
        title="New Bill"
        lines={newLines}
        totalCents={newTotalCents}
        moveButtonLabel="Move to Original Bill"
        emptyMessage="No items moved yet."
        onMoveItem={onMoveToOriginal}
        disabled={disabled}
      />
    </div>
  );
}
