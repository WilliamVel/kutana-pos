import type { ReactNode, Ref } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary";

export interface ButtonProps {
  readonly children: ReactNode;
  readonly onClick: () => void;
  readonly variant?: ButtonVariant;
  readonly disabled?: boolean;
  readonly type?: "button" | "submit";
  readonly ariaLabel?: string;
  readonly ariaBusy?: boolean;
  readonly loading?: boolean;
  readonly buttonRef?: Ref<HTMLButtonElement>;
  readonly ariaExpanded?: boolean;
  readonly ariaControls?: string;
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
  ariaLabel,
  ariaBusy = false,
  loading = false,
  buttonRef,
  ariaExpanded,
  ariaControls,
}: ButtonProps): JSX.Element {
  const variantClass = variant === "primary" ? styles.primary : styles.secondary;

  return (
    <button
      type={type}
      ref={buttonRef}
      className={`${styles.button} ${variantClass}`}
      data-variant={variant}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      aria-busy={loading || ariaBusy || undefined}
      onClick={onClick}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
