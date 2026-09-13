import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useAuth } from "../../../composition/PortsProvider.js";
import { Button } from "../../../design-system/atoms/Button.js";
import { Input } from "../../../design-system/atoms/Input.js";
import styles from "./ChangePinPanel.module.css";

export function ChangePinPanel({ onDone }: { readonly onDone: () => void }): JSX.Element {
  const auth = useAuth();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!/^\d{4}$/.test(currentPin) || !/^\d{4}$/.test(newPin) || newPin !== confirmation) {
      setMessage("El PIN debe tener exactamente 4 dígitos y coincidir con la confirmación.");
      return;
    }
    try {
      await auth.changePin({ currentPin, newPin });
      setMessage("PIN actualizado.");
      setCurrentPin("");
      setNewPin("");
      setConfirmation("");
    } catch {
      setMessage("No se pudo actualizar el PIN. Verificá tu PIN actual.");
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape") {
      event.preventDefault();
      onDone();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = event.currentTarget.querySelectorAll<HTMLElement>(
      'button, input, [href], [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onDone();
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-pin-title"
        aria-describedby="change-pin-description"
        onKeyDown={handleKeyDown}
      >
        <div className={styles.header}>
          <h2 id="change-pin-title">Cambiar PIN</h2>
          <button ref={closeButtonRef} type="button" className={styles.closeButton} onClick={onDone} aria-label="Cerrar Cambiar PIN">
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <p id="change-pin-description">Usá tu PIN actual para definir uno nuevo.</p>
        <form className={styles.form} onSubmit={(event) => void submit(event)}>
          <Input label="PIN actual" type="password" inputMode="numeric" value={currentPin} onChange={setCurrentPin} autoComplete="current-password" />
          <Input label="Nuevo PIN" type="password" inputMode="numeric" value={newPin} onChange={setNewPin} autoComplete="new-password" />
          <Input label="Confirmar nuevo PIN" type="password" inputMode="numeric" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
          {message ? <p role="status">{message}</p> : null}
          <div className={styles.actions}>
            <Button type="submit" onClick={() => undefined}>Actualizar PIN</Button>
            <Button type="button" variant="secondary" onClick={onDone}>Cancelar</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
