import type { ReactNode } from "react";
import styles from "./Panel.module.css";

export interface PanelProps {
  /** Optional tinted header text. Omit for a plain card. */
  readonly title?: string;
  /** Passed through to the outer element (e.g. role/aria-label for regions). */
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * Purely presentational molecule: a soft raised card with an optional
 * tinted header. Reused chrome for titled sections across the app. Props
 * in, markup out — no port access.
 */
export function Panel({ title, className, children }: PanelProps): JSX.Element {
  return (
    <div className={className ? `${styles.panel} ${className}` : styles.panel}>
      {title ? <p className={styles.header}>{title}</p> : null}
      <div className={styles.body}>{children}</div>
    </div>
  );
}
