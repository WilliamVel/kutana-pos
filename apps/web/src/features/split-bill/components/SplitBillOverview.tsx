import { Icon } from "../../../design-system/atoms/Icon.js";
import { PriceTag } from "../../../design-system/molecules/PriceTag.js";
import styles from "./SplitBillView.module.css";

export type SplitMethod = "person" | "equal" | "amount";

export interface SplitBillOverviewProps {
  readonly tableLabel: string;
  readonly tableTotalCents: number;
  readonly assignedCents: number;
  readonly unassignedCents: number;
  readonly tablePaidCents: number;
  readonly tableRemainingCents: number;
  readonly method: SplitMethod | null;
  readonly onChooseMethod: (method: SplitMethod) => void;
  readonly onChangeMethod: (method: SplitMethod) => void;
}

/** Presentational summary and method navigation. Assignment and payment state stay in SplitBillView. */
export function SplitBillOverview({
  tableLabel,
  tableTotalCents,
  assignedCents,
  unassignedCents,
  tablePaidCents,
  tableRemainingCents,
  method,
  onChooseMethod,
  onChangeMethod,
}: SplitBillOverviewProps): JSX.Element {
  return (
    <>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Dividir cuenta</p>
          <h2>{tableLabel} — Cuentas personales</h2>
        </div>
        <strong className={styles.heroTotal}>
          <PriceTag cents={tableTotalCents} />
        </strong>
      </header>

      <div className={styles.splitHeaderContent}>
        <section className={styles.summarySection} aria-labelledby="account-summary-title">
          <h3 id="account-summary-title" className={styles.sectionLabel}>
            Resumen de la cuenta
          </h3>
          <dl className={styles.tableSummary} aria-label="Resumen de la mesa">
            <div>
              <dt>Asignado</dt>
              <dd>
                <PriceTag cents={assignedCents} />
              </dd>
            </div>
            <div>
              <dt>Sin asignar</dt>
              <dd>
                <PriceTag cents={unassignedCents} />
              </dd>
            </div>
            <div>
              <dt>Pagado</dt>
              <dd>
                <PriceTag cents={tablePaidCents} />
              </dd>
            </div>
            <div className={styles.tableRemaining}>
              <dt>Saldo pendiente</dt>
              <dd>
                <PriceTag cents={tableRemainingCents} />
              </dd>
            </div>
          </dl>
        </section>

        <section className={styles.splitMethod} aria-labelledby="split-method-label">
          <h3 id="split-method-label" className={styles.sectionLabel}>
            Método de división
          </h3>
          {method === null ? (
            <div className={styles.methodChooser} aria-labelledby="split-method-title">
              <div>
                <p className={styles.eyebrow}>Cuenta de {tableLabel}</p>
                <h3 id="split-method-title">¿Cómo quieres dividir la cuenta?</h3>
              </div>
              <div className={styles.methodGrid}>
                <button type="button" onClick={() => onChooseMethod("person")}>
                  <Icon name="customers" size={24} />
                  <strong>Por persona</strong>
                  <span>Asigná productos y cantidades a cada persona.</span>
                </button>
                <button type="button" onClick={() => onChooseMethod("equal")}>
                  <Icon name="split" size={24} />
                  <strong>Partes iguales</strong>
                  <span>Calculá una parte exacta para cada comensal.</span>
                </button>
                <button type="button" onClick={() => onChooseMethod("amount")}>
                  <Icon name="cash" size={24} />
                  <strong>Por monto</strong>
                  <span>Cobrá montos parciales hasta completar el saldo.</span>
                </button>
              </div>
            </div>
          ) : (
            <nav className={styles.modeBar} aria-label="Método de división">
              <button
                type="button"
                className={method === "person" ? styles.modeActive : ""}
                onClick={() => onChangeMethod("person")}
              >
                Por persona
              </button>
              <button
                type="button"
                className={method === "equal" ? styles.modeActive : ""}
                onClick={() => onChangeMethod("equal")}
              >
                Partes iguales
              </button>
              <button
                type="button"
                className={method === "amount" ? styles.modeActive : ""}
                onClick={() => onChangeMethod("amount")}
              >
                Por monto
              </button>
            </nav>
          )}
        </section>
      </div>
    </>
  );
}
