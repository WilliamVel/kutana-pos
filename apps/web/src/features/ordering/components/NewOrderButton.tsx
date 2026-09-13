import { type FormEvent, useState } from "react";
import { Button } from "../../../design-system/atoms/Button.js";
import styles from "./NewOrderButton.module.css";

export interface NewOrderButtonTable {
  readonly id: string;
  readonly label: string;
}

export interface NewOrderButtonProps {
  readonly freeTables: readonly NewOrderButtonTable[];
  readonly onSelectTable: (tableId: string) => void;
  readonly onRemoveTable?: (tableId: string) => void;
  readonly onCreateTable?: (label: string) => void;
  /** Optional short, non-technical status line (e.g. after a conflict). */
  readonly message?: string | null;
}

/**
 * Purely presentational: a "Nueva orden" button that toggles a picker of
 * currently-free tables. Choosing one calls `onSelectTable`; the container
 * turns that into an order + an occupied table. Props in, markup out — no
 * port access.
 */
export function NewOrderButton({
  freeTables,
  onSelectTable,
  onRemoveTable,
  onCreateTable,
  message,
}: NewOrderButtonProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [tableLabel, setTableLabel] = useState("");

  const createTable = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const label = tableLabel.trim();
    if (!label || !onCreateTable) return;
    onCreateTable(label);
    setTableLabel("");
  };

  return (
    <div className={styles.wrap}>
      <Button variant="secondary" onClick={() => setOpen((current) => !current)}>
        Nueva orden
      </Button>

      {open ? (
        <div className={styles.panel}>
          {freeTables.length === 0 ? (
            <p className={styles.empty}>No hay mesas libres ahora.</p>
          ) : (
            <ul className={styles.picker} aria-label="Mesas libres">
              {freeTables.map((table) => (
                <li key={table.id}>
                  <div className={styles.tableOption}>
                    <button
                      type="button"
                      className={styles.tableButton}
                      onClick={() => onSelectTable(table.id)}
                    >
                      {table.label}
                    </button>
                    {onRemoveTable ? (
                      <button
                        type="button"
                        className={styles.removeButton}
                        aria-label={`Eliminar mesa ${table.label}`}
                        onClick={() => onRemoveTable(table.id)}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form className={styles.createForm} onSubmit={createTable}>
            <label className={styles.createLabel} htmlFor="new-table-label">
              Nombre de mesa
            </label>
            <div className={styles.createRow}>
              <input
                id="new-table-label"
                className={styles.createInput}
                value={tableLabel}
                onChange={(event) => setTableLabel(event.target.value)}
                placeholder="Barra, Mesa 7…"
              />
              <Button type="submit" disabled={tableLabel.trim().length === 0} onClick={() => undefined}>
                Crear mesa
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {message ? <p className={styles.message}>{message}</p> : null}
    </div>
  );
}
