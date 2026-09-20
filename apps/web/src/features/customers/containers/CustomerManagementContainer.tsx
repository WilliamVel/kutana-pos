import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createCustomer, type Customer } from "@kutana/shared/billing/model/personal-account.js";
import { useCustomerDebts, useCustomers } from "../../../composition/PortsProvider.js";
import { CustomerForm, type CustomerFormValues } from "../components/CustomerForm.js";
import { CustomerList } from "../components/CustomerList.js";
import styles from "./CustomerManagementContainer.module.css";

export function CustomerManagementContainer(): JSX.Element {
  const customersPort = useCustomers();
  const debtsPort = useCustomerDebts();
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [debts, setDebts] = useState<Awaited<ReturnType<typeof debtsPort.listAll>>>([]);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const detailRef = useRef<HTMLElement>(null);
  const detailTriggerRef = useRef<HTMLElement | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(false);
    try {
      const [customers, debtEntries] = await Promise.all([
        customersPort.listAll(),
        debtsPort.listAll(),
      ]);
      setAllCustomers(customers);
      setDebts(debtEntries);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [customersPort, debtsPort]);
  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query
      .trim()
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return allCustomers.filter(
      (customer) =>
        !needle ||
        [customer.displayName, customer.phone ?? "", customer.email ?? ""]
          .join(" ")
          .toLocaleLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .includes(needle),
    );
  }, [allCustomers, query]);
  const debtByCustomer = useMemo(
    () =>
      new Map(
        allCustomers.map((customer) => [
          customer.id,
          debts
            .filter((entry) => entry.customerId === customer.id)
            .reduce(
              (sum, entry) =>
                sum + (entry.direction === "debit" ? entry.amountCents : -entry.amountCents),
              0,
            ),
        ]),
      ),
    [allCustomers, debts],
  );

  async function save(values: CustomerFormValues): Promise<void> {
    setBusy(true);
    try {
      if (editing) {
        const saved = await customersPort.save({
          ...editing,
          displayName: values.displayName,
          phone: values.phone || null,
          email: values.email || null,
          notes: values.notes.trim() || null,
          updatedAt: new Date().toISOString(),
        });
        setSelected(saved);
        setNotice("Cliente actualizado.");
      } else {
        const saved = await customersPort.save(
          createCustomer({
            displayName: values.displayName,
            phone: values.phone || null,
            email: values.email || null,
            notes: values.notes.trim() || null,
          }),
        );
        setSelected(saved);
        setNotice("Cliente creado.");
      }
      setModal(null);
      setEditing(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  function requestDelete(customer: Customer): void {
    const debt = debtByCustomer.get(customer.id) ?? 0;
    if (debt > 0) {
      setNotice(
        `No se puede eliminar este cliente: mantiene un saldo pendiente de $${(debt / 100).toFixed(2)}.`,
      );
      return;
    }
    if (
      !window.confirm(
        "¿Eliminar este cliente? Se eliminará del directorio. Esta acción no se puede deshacer.",
      )
    )
      return;
    void (async () => {
      setBusy(true);
      try {
        await customersPort.delete(customer.id);
        setSelected(null);
        setNotice("Cliente eliminado.");
        await load();
      } catch {
        setNotice("No se pudo eliminar el cliente porque tiene relaciones financieras.");
      } finally {
        setBusy(false);
      }
    })();
  }

  return (
    <div className={styles.screen}>
      <CustomerList
        customers={filtered}
        totalCount={allCustomers.length}
        searchQuery={query}
        onSearchQueryChange={setQuery}
        onCreate={() => {
          setEditing(null);
          setModal("create");
        }}
        onSelectCustomer={(customer) => {
          detailTriggerRef.current = document.activeElement as HTMLElement | null;
          setSelected(customer);
        }}
        onEditCustomer={(customer) => {
          setEditing(customer);
          setSelected(null);
          setModal("edit");
        }}
        onDeleteCustomer={requestDelete}
        debtByCustomer={debtByCustomer}
        loading={loading}
        error={error}
        onRetry={() => void load()}
        notice={notice}
      />
      {selected && !modal ? (
        <CustomerDetailDrawer
          ref={detailRef}
          customer={selected}
          balanceCents={debtByCustomer.get(selected.id) ?? 0}
          onClose={() => {
            setSelected(null);
            detailTriggerRef.current?.focus();
          }}
          onEdit={() => {
            setEditing(selected);
            setModal("edit");
          }}
        />
      ) : null}
      {modal ? (
        <CustomerForm
          title={modal === "edit" ? "Editar cliente" : "Nuevo cliente"}
          initialValues={
            editing
              ? {
                  displayName: editing.displayName,
                  phone: editing.phone ?? "",
                  email: editing.email ?? "",
                  notes: editing.notes ?? "",
                }
              : undefined
          }
          onSubmit={save}
          onCancel={() => {
            setModal(null);
            setEditing(null);
          }}
          disabled={busy}
          submitLabel={modal === "edit" ? "Guardar cambios" : "Crear cliente"}
          customers={allCustomers}
          editingCustomerId={editing?.id}
          onViewExisting={(customer) => {
            setSelected(customer);
            setModal(null);
          }}
        />
      ) : null}
    </div>
  );
}

interface CustomerDetailDrawerProps {
  readonly customer: Customer;
  readonly balanceCents: number;
  readonly onClose: () => void;
  readonly onEdit: () => void;
}

const CustomerDetailDrawer = forwardRef<HTMLElement, CustomerDetailDrawerProps>(
  function CustomerDetailDrawer({ customer, balanceCents, onClose, onEdit }, ref): JSX.Element {
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
      closeRef.current?.focus();
      const handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
          return;
        }
        if (event.key !== "Tab" || typeof ref === "function" || !ref?.current) return;
        const focusable = Array.from(
          ref.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
          ),
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose, ref]);

    return (
      <div
        className={styles.detailBackdrop}
        onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      >
        <aside
          ref={ref}
          className={styles.detail}
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-detail-title"
        >
          <header className={styles.detailHeader}>
            <h2 id="customer-detail-title">DETALLE DEL CLIENTE</h2>
            <button
              ref={closeRef}
              className={styles.close}
              type="button"
              aria-label="Cerrar detalle del cliente"
              onClick={onClose}
            >
              ×
            </button>
          </header>
          <main className={styles.detailMain}>
            <section className={styles.identity} aria-labelledby="customer-name">
              <h3 id="customer-name">{customer.displayName}</h3>
            </section>
            <section className={styles.balanceCard} aria-label="Saldo pendiente">
              <span>Saldo pendiente</span>
              <strong>
                {balanceCents > 0 ? `$${(balanceCents / 100).toFixed(2)}` : "Sin saldo pendiente"}
              </strong>
            </section>
            <section className={styles.contactSection} aria-labelledby="customer-contact-title">
              <h3 id="customer-contact-title">Contacto</h3>
              <div className={styles.contactItem}>
                <span>Teléfono</span>
                {customer.phone ? (
                  <a href={`tel:${customer.phone}`}>{customer.phone}</a>
                ) : (
                  <strong>No registrado</strong>
                )}
              </div>
              <div className={styles.contactItem}>
                <span>Email</span>
                {customer.email ? (
                  <a className={styles.email} href={`mailto:${customer.email}`}>
                    {customer.email}
                  </a>
                ) : (
                  <strong>No registrado</strong>
                )}
              </div>
            </section>
            <section className={styles.notesSection} aria-labelledby="customer-notes-title">
              <h3 id="customer-notes-title">Notas</h3>
              <p className={!customer.notes ? styles.muted : undefined}>
                {customer.notes || "No hay notas"}
              </p>
            </section>
          </main>
          <footer className={styles.detailFooter}>
            <button type="button" className={styles.primaryAction} onClick={onEdit}>
              Editar cliente
            </button>
          </footer>
        </aside>
      </div>
    );
  },
);
