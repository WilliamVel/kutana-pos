import type { Customer } from "@kutana/shared/billing/model/personal-account.js";
import styles from "./CustomerList.module.css";

export interface CustomerListProps {
  readonly customers: readonly Customer[];
}

export function CustomerList({ customers }: CustomerListProps): JSX.Element {
  return (
    <section aria-label="Customer list" className={styles.card}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Available For Selection</p>
        <h3>Saved Customers</h3>
        <p>These names appear when creating personal accounts or linking free-name pending debts.</p>
      </div>
      {customers.length === 0 ? <p className={styles.emptyState}>No customers yet. Create the first customer to use them in account assignment.</p> : null}
      <div className={styles.rows}>
        {customers.map((customer) => (
          <article key={customer.id} aria-label={`Customer ${customer.displayName}`} className={styles.row}>
            <div>
              <strong>{customer.displayName}</strong>
              <p>{customer.phone || "No phone"} · {customer.email || "No email"}</p>
            </div>
            {customer.notes ? <p className={styles.notes}>{customer.notes}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
