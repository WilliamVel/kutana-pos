import { useState, type FormEvent } from "react";
import { Button } from "../../../design-system/atoms/Button.js";
import { Input } from "../../../design-system/atoms/Input.js";
import styles from "./CustomerForm.module.css";

export interface CustomerFormValues {
  readonly displayName: string;
  readonly phone: string;
  readonly email: string;
  readonly notes: string;
}

export interface CustomerFormProps {
  readonly onSubmit: (values: CustomerFormValues) => void;
  readonly disabled: boolean;
  readonly message: string | null;
}

const EMPTY_VALUES: CustomerFormValues = {
  displayName: "",
  phone: "",
  email: "",
  notes: "",
};

export function CustomerForm({ onSubmit, disabled, message }: CustomerFormProps): JSX.Element {
  const [values, setValues] = useState<CustomerFormValues>(EMPTY_VALUES);

  function update<K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]): void {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit(values);
    setValues(EMPTY_VALUES);
  }

  const canSubmit = values.displayName.trim().length > 0 && !disabled;

  return (
    <form aria-label="Customer form" role="form" className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Customer Directory</p>
        <h2>Customers</h2>
        <p>Create customers here so they appear in account assignment and pending-debt linking.</p>
      </div>

      {message ? <div role="status" aria-live="polite" className={styles.message}>{message}</div> : null}

      <Input label="Display name" value={values.displayName} onChange={(value) => update("displayName", value)} placeholder="Ada Lovelace" />
      <div className={styles.row}>
        <Input label="Phone" value={values.phone} onChange={(value) => update("phone", value)} placeholder="555-0101" />
        <Input label="Email" value={values.email} onChange={(value) => update("email", value)} placeholder="ada@example.com" />
      </div>
      <Input label="Notes" value={values.notes} onChange={(value) => update("notes", value)} multiline placeholder="Preferences, contact context, or collection notes" />

      <div className={styles.actions}>
        <Button type="submit" onClick={() => {}} disabled={!canSubmit}>
          Create customer
        </Button>
      </div>
    </form>
  );
}
