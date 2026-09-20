import type { Customer } from "@kutana/shared/billing/model/personal-account.js";
import { Icon } from "../../../design-system/atoms/Icon.js";
import { Button } from "../../../design-system/atoms/Button.js";
import styles from "./CustomerList.module.css";

export interface CustomerListProps {
  readonly customers: readonly Customer[];
  readonly totalCount: number;
  readonly searchQuery: string;
  readonly onSearchQueryChange: (query: string) => void;
  readonly onCreate: () => void;
  readonly onSelectCustomer: (customer: Customer) => void;
  readonly onEditCustomer: (customer: Customer) => void;
  readonly onDeleteCustomer: (customer: Customer) => void;
  readonly debtByCustomer: ReadonlyMap<string, number>;
  readonly loading?: boolean;
  readonly error?: boolean;
  readonly onRetry?: () => void;
  readonly notice?: string | null;
}

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase();

export function CustomerList({
  customers,
  totalCount,
  searchQuery,
  onSearchQueryChange,
  onCreate,
  onSelectCustomer,
  onEditCustomer,
  onDeleteCustomer,
  debtByCustomer,
  loading = false,
  error = false,
  onRetry,
  notice = null,
}: CustomerListProps): JSX.Element {
  const hasSearch = Boolean(searchQuery.trim());
  return (
    <section className={styles.screen} aria-labelledby="customer-directory-heading">
      <header className={styles.header}>
        <div className={styles.headingCopy}>
          <p className={styles.eyebrow}>Directorio</p>
          <h2 id="customer-directory-heading">Clientes</h2>
          <p>Administra los clientes utilizados en cuentas personales y pagos pendientes.</p>
          <span className={styles.count}>
            {totalCount} {totalCount === 1 ? "cliente" : "clientes"}
          </span>
        </div>
        <Button onClick={onCreate}>
          <Icon name="plus" size={18} /> Nuevo cliente
        </Button>
      </header>
      <div className={styles.searchRow} role="search">
        <Icon name="search" size={18} />
        <label className={styles.srOnly} htmlFor="customer-search">
          Buscar por nombre, teléfono o email
        </label>
        <input
          id="customer-search"
          aria-label="Buscar clientes por nombre"
          type="search"
          placeholder="Buscar por nombre, teléfono o email"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
        />
        {searchQuery ? (
          <button
            type="button"
            className={styles.clearButton}
            aria-label="Limpiar búsqueda"
            onClick={() => onSearchQueryChange("")}
          >
            <Icon name="close" size={16} />
          </button>
        ) : null}
      </div>
      <div className={styles.live} role="status" aria-live="polite" aria-atomic="true">
        {notice ?? (hasSearch ? `${customers.length} resultados` : "")}
      </div>
      {loading ? (
        <div className={styles.loading} aria-label="Cargando clientes">
          {[1, 2, 3].map((item) => (
            <div className={styles.skeleton} key={item} />
          ))}
        </div>
      ) : error ? (
        <div className={styles.empty}>
          <h3>No pudimos cargar los clientes.</h3>
          <Button variant="secondary" onClick={onRetry ?? (() => undefined)}>
            Intentar de nuevo
          </Button>
        </div>
      ) : totalCount === 0 ? (
        <div className={styles.empty}>
          <h3>Todavía no hay clientes</h3>
          <p>Agrega clientes para asociarlos con cuentas personales y pagos pendientes.</p>
          <Button onClick={onCreate}>Crear primer cliente</Button>
        </div>
      ) : customers.length === 0 ? (
        <div className={styles.empty}>
          <h3>No encontramos clientes</h3>
          <p>Prueba con otro nombre, teléfono o email.</p>
          <Button variant="secondary" onClick={() => onSearchQueryChange("")}>
            Limpiar búsqueda
          </Button>
        </div>
      ) : (
        <ul className={styles.list} aria-label="Clientes existentes">
          {customers.map((customer) => (
            <CustomerRow
              key={customer.id}
              customer={customer}
              debt={debtByCustomer.get(customer.id) ?? 0}
              onSelect={onSelectCustomer}
              onEdit={onEditCustomer}
              onDelete={onDeleteCustomer}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function CustomerRow({
  customer,
  debt,
  onSelect,
  onEdit,
  onDelete,
}: {
  readonly customer: Customer;
  readonly debt: number;
  readonly onSelect: (customer: Customer) => void;
  readonly onEdit: (customer: Customer) => void;
  readonly onDelete: (customer: Customer) => void;
}): JSX.Element {
  return (
    <li className={styles.row}>
      <button type="button" className={styles.rowMain} onClick={() => onSelect(customer)}>
        <span className={styles.avatar} aria-hidden="true">
          {initials(customer.displayName) || "?"}
        </span>
        <span className={styles.name}>
          <strong>{customer.displayName}</strong>
          <span>{customer.phone || customer.email || "Sin datos de contacto"}</span>
        </span>
        <span className={styles.contact}>
          {customer.phone || "—"}
          <br />
          {customer.email || "—"}
        </span>
        <span className={debt > 0 ? styles.debt : styles.noDebt}>
          {debt > 0 ? `Saldo pendiente: $${(debt / 100).toFixed(2)}` : "Sin deuda"}
        </span>
        <span className={styles.activity}>
          Actualizado {new Date(customer.updatedAt).toLocaleDateString("es-EC")}
        </span>
      </button>
      <div className={styles.menuWrap}>
        <details>
          <summary aria-label={`Acciones para ${customer.displayName}`}>
            <Icon name="more" size={20} />
          </summary>
          <div className={styles.menu}>
            <button type="button" onClick={() => onSelect(customer)}>
              Ver detalles
            </button>
            <button
              type="button"
              aria-label={`Editar cliente ${customer.displayName}`}
              onClick={() => onEdit(customer)}
            >
              Editar
            </button>
            <button
              type="button"
              className={styles.destructive}
              aria-label={`Eliminar cliente ${customer.displayName}`}
              onClick={() => onDelete(customer)}
            >
              Eliminar cliente
            </button>
          </div>
        </details>
      </div>
    </li>
  );
}
