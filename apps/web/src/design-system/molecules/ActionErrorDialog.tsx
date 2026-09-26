import { useEffect, useRef } from "react";
import styles from "./ActionErrorDialog.module.css";

export interface ActionErrorDialogProps {
  readonly title: string;
  readonly message: string;
  readonly onClose: () => void;
  readonly closeLabel?: string;
}

export function ActionErrorDialog({
  title,
  message,
  onClose,
  closeLabel = "Volver al formulario",
}: ActionErrorDialogProps): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [
        ...dialogRef.current.querySelectorAll<HTMLElement>(
          "button, [href], input, select, textarea",
        ),
      ];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (openerRef.current?.isConnected) openerRef.current.focus();
    };
  }, [onClose]);

  return (
    <div className={styles.backdrop} role="presentation">
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="action-error-title"
        aria-describedby="action-error-message"
        tabIndex={-1}
      >
        <div className={styles.icon} aria-hidden="true">
          !
        </div>
        <h2 id="action-error-title">{title}</h2>
        <p id="action-error-message">{message}</p>
        <button type="button" onClick={onClose} autoFocus>
          {closeLabel}
        </button>
      </div>
    </div>
  );
}
