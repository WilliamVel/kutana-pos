import type { ReactNode } from "react";
import styles from "./ActionBar.module.css";

export interface ActionBarProps {
  /** Left slot — running totals for the active screen. */
  readonly totals?: ReactNode;
  /** Right slot — the screen's primary action(s). */
  readonly actions?: ReactNode;
}

/**
 * Purely presentational: a sticky bottom bar with a totals slot on the
 * left and a primary-action slot on the right. Renders nothing of its own
 * — callers decide what each slot contains.
 */
export function ActionBar({ totals, actions }: ActionBarProps): JSX.Element {
  return (
    <div className={styles.bar}>
      <div className={styles.totals}>{totals}</div>
      <div className={styles.actions}>{actions}</div>
    </div>
  );
}
