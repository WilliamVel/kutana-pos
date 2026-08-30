import type { ReactNode } from "react";
import styles from "./Badge.module.css";

export type BadgeTone = "neutral" | "success" | "warning" | "danger";

export interface BadgeProps {
  readonly children: ReactNode;
  readonly tone: BadgeTone;
}

/** Purely presentational atom: props in, markup out. No port access. */
export function Badge({ children, tone }: BadgeProps): JSX.Element {
  return (
    <span className={`${styles.badge} ${styles[tone]}`} data-tone={tone}>
      {children}
    </span>
  );
}
