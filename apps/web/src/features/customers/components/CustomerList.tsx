import type { Customer } from "@kutana/shared/billing/model/personal-account.js";
import { Icon } from "../../../design-system/atoms/Icon.js";
import styles from "./CustomerList.module.css";

export interface CustomerListProps {
  readonly customers: readonly Customer[];
  readonly onDeleteCustomer?: (customerId: string) => void;
}

export function CustomerList({ customers, onDeleteCustomer }: CustomerListProps): JSX.Element {
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
            <div className={styles.rowHeader}>
              <div>
                <strong>{customer.displayName}</strong>
                <p>
                  {customer.phone || "Sin teléfono"} · {customer.email || "Sin email"}
                </p>
              </div>
              {onDeleteCustomer ? (
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label={`Eliminar cliente ${customer.displayName}`}
                  title="Eliminar cliente"
                  onClick={() => onDeleteCustomer(customer.id)}
                >
                  <Icon name="trash" size={18} />
                </button>
              ) : null}
            </div>
            {customer.notes ? <p className={styles.notes}>{customer.notes}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
