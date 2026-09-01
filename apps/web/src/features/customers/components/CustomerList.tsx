import type { Customer } from "@kutana/shared/billing/model/personal-account.js";
import styles from "./CustomerList.module.css";

export interface CustomerListProps {
  readonly customers: readonly Customer[];
}

export function CustomerList({ customers }: CustomerListProps): JSX.Element {
  return (
    <section aria-label="Lista de clientes" className={styles.card}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Disponibles para selección</p>
        <h3>Clientes guardados</h3>
        <p>Estos nombres aparecen al crear cuentas personales o vincular deudas pendientes.</p>
      </div>
      {customers.length === 0 ? (
        <p className={styles.emptyState}>
          Todavía no hay clientes. Creá el primero para usarlo en la asignación de cuentas.
        </p>
      ) : null}
      <div className={styles.rows}>
        {customers.map((customer) => (
          <article
            key={customer.id}
            aria-label={`Cliente ${customer.displayName}`}
            className={styles.row}
          >
            <div>
              <strong>{customer.displayName}</strong>
              <p>
                {customer.phone || "Sin teléfono"} · {customer.email || "Sin email"}
              </p>
            </div>
            {customer.notes ? <p className={styles.notes}>{customer.notes}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
