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

  const load = useCallback(async (): Promise<void> => {
    setCustomers(await customersPort.listAll());
  }, [customersPort]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = (values: CustomerFormValues): void => {
    void (async () => {
      setBusy(true);
      try {
        await customersPort.save(
          createCustomer({
            displayName: values.displayName,
            phone: values.phone.trim() || null,
            email: values.email.trim() || null,
            notes: values.notes.trim() || null,
          }),
        );
        setMessage("Cliente creado.");
        await load();
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <div className={styles.screen}>
      <CustomerForm onSubmit={create} disabled={busy} message={message} />
      <CustomerList customers={customers} />
    </div>
  );
}
