import type { PourSize } from "@kutana/shared/catalog/model/product.js";
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
}

/**
 * Purely presentational molecule: props in, markup out, no port access.
 * Renders one Order line item — the row primitive used by the ticket/order
 * panels built in PR6+.
 */
export function LineItemRow({
  name,
  quantity,
  totalCents,
  pourSizeMl,
  isAdjustment = false,
}: LineItemRowProps): JSX.Element {
  return (
    <div className={styles.row}>
      <div className={styles.details}>
        <span className={styles.name}>{name}</span>
        <span className={styles.quantity}>x{quantity}</span>
        {pourSizeMl ? <span className={styles.pourSize}>{pourSizeMl}ml</span> : null}
        {isAdjustment ? <span className={styles.adjustmentLabel}>Adjustment</span> : null}
      </div>
      <PriceTag cents={totalCents} />
    </div>
  );
}
