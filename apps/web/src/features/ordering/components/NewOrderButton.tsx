import { type FormEvent, useEffect, useRef, useState } from "react";
import { Icon } from "../../../design-system/atoms/Icon.js";
import { ActionErrorDialog } from "../../../design-system/molecules/ActionErrorDialog.js";
import styles from "./NewOrderButton.module.css";

export interface NewOrderButtonTable {
  readonly id: string;
  readonly label: string;
}

export interface NewOrderButtonProps {
  readonly freeTables: readonly NewOrderButtonTable[];
  readonly onSelectTable: (tableId: string) => Promise<void> | void;
  readonly onRemoveTable?: (tableId: string) => void;
  readonly onCreateTable?: (label: string) => Promise<void> | void;
  readonly message?: string | null;
  readonly openRequest?: number;
}

type ServiceMode = "table" | "bar" | "takeaway";

const PLACEHOLDERS: Record<ServiceMode, string> = {
  table: "Ej. Mesa 7",
  bar: "Ej. Barra 2",
  takeaway: "Ej. Pedido Carlos",
};

export function NewOrderButton({
  freeTables,
  onSelectTable,
  onCreateTable,
  message,
  openRequest = 0,
}: NewOrderButtonProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ServiceMode>("table");
  const [tableLabel, setTableLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const sheetRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const touchStartY = useRef<number | null>(null);

  const close = (force = false): void => {
    if (loading && !force) return;
    setOpen(false);
    setError(null);
    setErrorDialogOpen(false);
    setTableLabel("");
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };

  useEffect(() => {
    if (openRequest > 0) setOpen(true);
  }, [openRequest]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusable = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>("button, input"),
      ).filter((element) => !element.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, loading]);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const label = tableLabel.trim();
    if (!label) {
      setError("Escribe un nombre o número.");
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const selected = freeTables.find(
        (table) => table.label.toLocaleLowerCase() === label.toLocaleLowerCase(),
      );
      if (selected && mode === "table") await onSelectTable(selected.id);
      else if (onCreateTable) await onCreateTable(label);
      close(true);
    } catch (submissionError) {
      // Never expose transport details (HTTP status, URL or response body) in the
      // ordering flow. The form stays open so the operator can correct the value.
      const status =
        typeof submissionError === "object" &&
        submissionError !== null &&
        "status" in submissionError
          ? Number((submissionError as { status?: unknown }).status)
          : null;
      setError(
        status === 409
          ? "Ya existe una mesa con ese nombre o número. Prueba con otro."
          : "No se pudo crear la mesa. Comprueba el nombre e inténtalo de nuevo.",
      );
      setErrorDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const chooseTable = (table: NewOrderButtonTable): void => {
    if (!onCreateTable) void onSelectTable(table.id);
    setMode("table");
    setTableLabel(table.label);
    setError(null);
    inputRef.current?.focus();
  };

  return (
    <div className={styles.wrap}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label="Nueva orden"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">+</span>
        <span>Nueva orden</span>
      </button>

      {open ? (
        <div
          className={styles.sheetBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) close();
          }}
        >
          <section
            ref={sheetRef}
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-order-title"
            onTouchStart={(event) => {
              touchStartY.current = event.touches[0]?.clientY ?? null;
            }}
            onTouchEnd={(event) => {
              const start = touchStartY.current;
              const end = event.changedTouches[0]?.clientY;
              if (start !== null && end !== undefined && end - start > 80) close();
              touchStartY.current = null;
            }}
          >
            <div className={styles.dragHandle} aria-hidden="true" />
            <div className={styles.sheetHeader}>
              <h2 id="new-order-title">Nueva orden</h2>
              <button
                type="button"
                className={styles.closeButton}
                aria-label="Cerrar"
                onClick={() => close()}
              >
                <span className={styles.closeText} aria-hidden="true">
                  ×
                </span>
                <span className={styles.closeIcon} aria-hidden="true">
                  <Icon name="close" size={21} />
                </span>
              </button>
            </div>
            <form onSubmit={(event) => void submit(event)}>
              <fieldset className={styles.modeFieldset}>
                <legend>¿Dónde se atenderá?</legend>
                <div className={styles.modeOptions}>
                  {(
                    [
                      ["table", "Mesa"],
                      ["bar", "Barra"],
                      ["takeaway", "Para llevar"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={styles.modeButton}
                      data-selected={mode === value}
                      onClick={() => {
                        setMode(value);
                        setTableLabel("");
                        setError(null);
                        inputRef.current?.focus();
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className={styles.inputLabel} htmlFor="new-order-label">
                Nombre o número
              </label>
              <input
                ref={inputRef}
                id="new-order-label"
                className={styles.createInput}
                value={tableLabel}
                onChange={(event) => {
                  setTableLabel(event.target.value);
                  setError(null);
                }}
                placeholder={PLACEHOLDERS[mode]}
                autoComplete="off"
              />
              {error || message ? (
                <div className={styles.message} role="alert" aria-live="assertive">
                  <strong>
                    {error ? "No se pudo crear la mesa" : "No se pudo completar la orden"}
                  </strong>
                  <span>{error ?? message}</span>
                </div>
              ) : null}
              {mode === "table" && freeTables.length === 0 ? (
                <p className={styles.empty}>No hay mesas libres ahora.</p>
              ) : null}
              {mode === "table" && freeTables.length > 0 ? (
                <div className={styles.availableTables}>
                  <span>Mesas disponibles</span>
                  <div className={styles.chips}>
                    {freeTables.map((table) => (
                      <button
                        key={table.id}
                        type="button"
                        className={styles.chip}
                        onClick={() => chooseTable(table)}
                      >
                        {table.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <button
                type="submit"
                className={styles.createButton}
                disabled={loading || tableLabel.trim().length === 0}
              >
                {loading ? "Creando…" : "Crear orden"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
      {errorDialogOpen && error ? (
        <ActionErrorDialog
          title={error.startsWith("Ya existe") ? "Mesa duplicada" : "No se pudo crear la mesa"}
          message={error}
          onClose={() => {
            setErrorDialogOpen(false);
            window.setTimeout(() => inputRef.current?.focus(), 0);
          }}
        />
      ) : null}
    </div>
  );
}
