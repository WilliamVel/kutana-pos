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
    <form
      aria-label="Formulario de cliente"
      role="form"
      className={styles.form}
      onSubmit={handleSubmit}
    >
      <div className={styles.header}>
        <p className={styles.eyebrow}>Directorio de clientes</p>
        <h2>Clientes</h2>
        <p>Creá clientes para usarlos en cuentas personales y en deudas pendientes.</p>
      </div>

      {message ? (
        <div role="status" aria-live="polite" className={styles.message}>
          {message}
        </div>
      ) : null}

      <Input
        label="Nombre visible"
        value={values.displayName}
        onChange={(value) => update("displayName", value)}
        placeholder="Ada Lovelace…"
      />
      <div className={styles.row}>
        <Input
          label="Teléfono"
          value={values.phone}
          onChange={(value) => update("phone", value)}
          placeholder="555-0101…"
        />
        <Input
          label="Email"
          value={values.email}
          onChange={(value) => update("email", value)}
          placeholder="ada@example.com…"
        />
      </div>
      <Input
        label="Notas"
        value={values.notes}
        onChange={(value) => update("notes", value)}
        multiline
        placeholder="Preferencias, contexto de contacto o notas de cobro…"
      />

      <div className={styles.actions}>
        <Button type="submit" onClick={() => {}} disabled={!canSubmit}>
          Crear cliente
        </Button>
      </div>
    </form>
  );
}
