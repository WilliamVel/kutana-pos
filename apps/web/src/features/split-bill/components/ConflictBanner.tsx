import { Button } from "../../../design-system/atoms/Button.js";
import styles from "./ConflictBanner.module.css";

export interface ConflictBannerProps {
  /**
   * Plain-language, non-technical text for a server on a busy shift — no
   * status codes, no error class names, no stack traces. The container is
   * responsible for translating the domain `ConflictError` into this copy.
   */
  readonly message: string;
  /** Re-enables the account-assignment action the conflict interrupted. */
  readonly onDismiss: () => void;
}

/**
 * Purely presentational: props in, markup out, no port access. Shown when
 * the container catches a `ConflictError` while saving a split — the order
 * changed on another device, so the refreshed data is already reflected in
 * the panels behind this banner by the time it renders.
 */
export function ConflictBanner({ message, onDismiss }: ConflictBannerProps): JSX.Element {
  return (
    <div className={styles.banner} role="alert">
      <p>{message}</p>
      <Button variant="secondary" onClick={onDismiss}>
        Got it — try again
      </Button>
    </div>
  );
}
