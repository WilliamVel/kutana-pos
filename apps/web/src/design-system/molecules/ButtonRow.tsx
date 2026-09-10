import type { ReactNode } from "react";
import styles from "./ButtonRow.module.css";

export interface ButtonRowProps {
  /**
   * Two (or more) action buttons that should share the row equally — each
   * child is stretched to an even fraction of the available width.
   */
  readonly children: ReactNode;
  /** Optional hook for a context-specific layout variant. */
  readonly className?: string;
}

/**
 * Purely presentational: props in, markup out, no port access. Lays out a
 * set of primary/secondary action buttons so they fill the container edge
 * to edge in equal slices (half and half for two buttons). Used for order,
 * account-assignment, and payment actions.
 */
export function ButtonRow({ children, className }: ButtonRowProps): JSX.Element {
  return <div className={[styles.row, className].filter(Boolean).join(" ")}>{children}</div>;
}
