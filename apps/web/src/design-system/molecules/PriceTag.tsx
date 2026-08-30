import { formatCents } from "./format-cents.js";
import styles from "./PriceTag.module.css";

export interface PriceTagProps {
  /** Integer cents — never a float dollar amount (see @kutana/shared Money). */
  readonly cents: number;
}

/**
 * Purely presentational molecule: props in, markup out, no port access.
 * Formats integer-cents Money correctly using integer arithmetic only.
 */
export function PriceTag({ cents }: PriceTagProps): JSX.Element {
  return <span className={styles.priceTag}>{formatCents(cents)}</span>;
}
