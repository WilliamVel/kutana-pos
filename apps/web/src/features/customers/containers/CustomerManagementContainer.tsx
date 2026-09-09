import { useCallback, useEffect, useState } from "react";
import { createCustomer, type Customer } from "@kutana/shared/billing/model/personal-account.js";
import { useCustomers } from "../../../composition/PortsProvider.js";
import { CustomerForm, type CustomerFormValues } from "../components/CustomerForm.js";
import { CustomerList } from "../components/CustomerList.js";
import styles from "./CustomerManagementContainer.module.css";

export function CustomerManagementContainer(): JSX.Element {
  const customersPort = useCustomers();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setCustomers(
      searchQuery.trim() ? await customersPort.search(searchQuery) : await customersPort.listAll(),
    );
  }, [customersPort, searchQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  const deleteCustomer = (customerId: string): void => {
    void (async () => {
      setBusy(true);
      try {
        await customersPort.delete(customerId);
        setMessage("Cliente eliminado.");
        await load();
      } finally {
        setBusy(false);
      }
    })();
  };

  const saveCustomer = (values: CustomerFormValues): void => {
    void (async () => {
      setBusy(true);
      try {
        if (editingCustomer) {
          await customersPort.save({
            ...editingCustomer,
            displayName: values.displayName.trim(),
            phone: values.phone.trim() || null,
            email: values.email.trim() || null,
            notes: values.notes.trim() || null,
            updatedAt: new Date().toISOString(),
          });
          setEditingCustomer(null);
          setMessage("Cliente actualizado.");
        } else {
          await customersPort.save(
            createCustomer({
              displayName: values.displayName,
              phone: values.phone.trim() || null,
              email: values.email.trim() || null,
              notes: values.notes.trim() || null,
            }),
          );
          setMessage("Cliente creado.");
        }
        await load();
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <div className={styles.screen}>
      <CustomerForm
        onSubmit={saveCustomer}
        disabled={busy}
        message={message}
        initialValues={
          editingCustomer
            ? {
                displayName: editingCustomer.displayName,
                phone: editingCustomer.phone ?? "",
                email: editingCustomer.email ?? "",
                notes: editingCustomer.notes ?? "",
              }
            : undefined
        }
        submitLabel={editingCustomer ? "Guardar cambios" : "Crear cliente"}
        onCancel={editingCustomer ? () => setEditingCustomer(null) : undefined}
      />
      <CustomerList
        customers={customers}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onEditCustomer={setEditingCustomer}
        onDeleteCustomer={deleteCustomer}
      />
    </div>
  );
}
