import type { ReactNode } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary";

export interface ButtonProps {
  readonly children: ReactNode;
  readonly onClick: () => void;
  readonly variant?: ButtonVariant;
  readonly disabled?: boolean;
  readonly type?: "button" | "submit";
}

/**
 * Purely presentational atom: props in, markup out. No port access, no
 * data fetching — this component is safe to render in a Storybook/visual
 * test with zero adapters.
 */
export function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  type = "button",
}: ButtonProps): JSX.Element {
  const variantClass = variant === "primary" ? styles.primary : styles.secondary;

  return (
    <button
      type={type}
      className={`${styles.button} ${variantClass}`}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
