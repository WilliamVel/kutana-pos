import type { PourSize } from "@kutana/shared/catalog/model/product.js";
import { Icon } from "../atoms/Icon.js";
import { PriceTag } from "./PriceTag.js";
import styles from "./LineItemRow.module.css";

export interface LineItemRowProps {
  readonly name: string;
  readonly quantity: number;
  /** Integer cents. */
  readonly unitPriceCents: number;
  /** Integer cents. */
  readonly totalCents: number;
  readonly pourSizeMl?: PourSize | null;
  readonly isAdjustment?: boolean;
  readonly statusLabel?: string;
  /** When provided, renders a compact "remove this line" control. */
  readonly onRemove?: () => void;
}

/**
 * Purely presentational molecule: props in, markup out, no port access.
 * Renders one Order line item — the row primitive used by order, account, and
 * payment panels.
 */
export function LineItemRow({
  name,
  quantity,
  totalCents,
  pourSizeMl,
  isAdjustment = false,
  statusLabel,
  onRemove,
}: LineItemRowProps): JSX.Element {
  return (
    <div className={styles.row}>
      <div className={styles.details}>
        <span className={styles.name}>{name}</span>
        <span className={styles.quantity}>x{quantity}</span>
        {pourSizeMl ? <span className={styles.pourSize}>{pourSizeMl}ml</span> : null}
        {isAdjustment ? <span className={styles.adjustmentLabel}>Adjustment</span> : null}
        {statusLabel ? <span className={styles.statusLabel}>{statusLabel}</span> : null}
      </div>
      <div className={styles.trailing}>
        <PriceTag cents={totalCents} />
        {onRemove ? (
          <button
            type="button"
            className={styles.remove}
            aria-label={`Quitar producto ${name}`}
            title="Quitar producto"
            onClick={() => {
              onRemove();
            }}
          >
            <Icon name="trash" size={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
