import { useState } from "react";
import { Button } from "../../../design-system/atoms/Button.js";
import styles from "./NewOrderButton.module.css";

export interface NewOrderButtonTable {
  readonly id: string;
  readonly label: string;
}

export interface NewOrderButtonProps {
  readonly freeTables: readonly NewOrderButtonTable[];
  readonly onSelectTable: (tableId: string) => void;
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
  message,
}: NewOrderButtonProps): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.wrap}>
      <Button variant="secondary" onClick={() => setOpen((current) => !current)}>
        Nueva orden
      </Button>

      {open ? (
        freeTables.length === 0 ? (
          <p className={styles.empty}>No hay mesas libres ahora.</p>
        ) : (
          <ul className={styles.picker} aria-label="Mesas libres">
            {freeTables.map((table) => (
              <li key={table.id}>
                <button
                  type="button"
                  className={styles.tableButton}
                  onClick={() => onSelectTable(table.id)}
                >
                  {table.label}
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {message ? <p className={styles.message}>{message}</p> : null}
    </div>
  );
}
