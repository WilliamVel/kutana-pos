import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Customer } from "@kutana/shared/billing/model/personal-account.js";
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
  readonly onSubmit: (values: CustomerFormValues) => Promise<void>;
  readonly disabled: boolean;
  readonly message?: string | null;
  readonly initialValues?: CustomerFormValues;
  readonly submitLabel?: string;
  readonly title?: string;
  readonly onCancel?: () => void;
  readonly customers?: readonly Customer[];
  readonly editingCustomerId?: string;
  readonly onViewExisting?: (customer: Customer) => void;
}

const EMPTY_VALUES: CustomerFormValues = { displayName: "", phone: "", email: "", notes: "" };
const MAX_NAME_LENGTH = 160;
const normalizePhone = (value: string): string => value.replace(/\D/g, "");
const normalizeEmail = (value: string): string => value.trim().toLocaleLowerCase();

export function CustomerForm({
  onSubmit,
  disabled,
  message = null,
  initialValues,
  submitLabel = "Crear cliente",
  title = "Nuevo cliente",
  onCancel,
  customers = [],
  editingCustomerId,
  onViewExisting,
}: CustomerFormProps): JSX.Element {
  const [values, setValues] = useState<CustomerFormValues>(initialValues ?? EMPTY_VALUES);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const firstInput = useRef<HTMLInputElement>(null);
  const initial = initialValues ?? EMPTY_VALUES;

  useEffect(() => {
    setValues(initialValues ?? EMPTY_VALUES);
    firstInput.current?.focus();
  }, [initialValues]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !disabled) close();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  const normalizedName = values.displayName.trim().replace(/\s+/g, " ");
  const email = normalizeEmail(values.email);
  const phone = normalizePhone(values.phone);
  const validation = !normalizedName
    ? "El nombre visible es obligatorio."
    : normalizedName.length > MAX_NAME_LENGTH
      ? `El nombre no puede superar los ${MAX_NAME_LENGTH} caracteres.`
      : email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? "Escribe un email válido."
        : "";
  const duplicate = customers.find(
    (customer) =>
      customer.id !== editingCustomerId &&
      ((phone.length > 0 && normalizePhone(customer.phone ?? "") === phone) ||
        (email.length > 0 && normalizeEmail(customer.email ?? "") === email)),
  );
  const changed = JSON.stringify(values) !== JSON.stringify(initial);
  const displayedError = error || (touched ? validation : "");

  function update<K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]): void {
    setValues((current) => ({ ...current, [key]: value }));
    setTouched(true);
    setError("");
  }

  function close(): void {
    if (changed && !window.confirm("Tienes cambios sin guardar. ¿Quieres cerrar?")) return;
    onCancel?.();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (validation || disabled) {
      setTouched(true);
      return;
    }
    try {
      await onSubmit({ ...values, displayName: normalizedName, phone: values.phone.trim(), email });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudieron guardar los cambios.");
    }
  }

  return (
    <div
      className={styles.modalBackdrop}
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-form-title"
      >
        <div className={styles.header}>
          <p className={styles.eyebrow}>Directorio</p>
          <h2 id="customer-form-title">{title}</h2>
          <p>Administra los datos que se usan en cuentas personales y cobros pendientes.</p>
        </div>
        {message || displayedError ? (
          <div
            className={displayedError ? styles.error : styles.message}
            role={displayedError ? "alert" : "status"}
          >
            {displayedError || message}
          </div>
        ) : null}
        <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
          <Input
            ref={firstInput}
            label="Nombre visible"
            value={values.displayName}
            onChange={(value) => update("displayName", value)}
            required
            maxLength={MAX_NAME_LENGTH}
            error={displayedError && !error.includes("guard") ? displayedError : undefined}
            autoComplete="name"
          />
          <div className={styles.row}>
            <Input
              label="Teléfono"
              value={values.phone}
              onChange={(value) => update("phone", value)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
            />
            <Input
              label="Email"
              value={values.email}
              onChange={(value) => update("email", value)}
              type="email"
              inputMode="email"
              autoComplete="email"
              error={touched && email && validation ? validation : undefined}
            />
          </div>
          <Input
            label="Notas"
            value={values.notes}
            onChange={(value) => update("notes", value)}
            multiline
            autoComplete="off"
            placeholder="Preferencias, contexto de contacto o información útil para el cobro."
          />
          {duplicate ? (
            <div className={styles.warning} role="status">
              <span>
                Ya existe un cliente con este{" "}
                {phone && normalizePhone(duplicate.phone ?? "") === phone ? "teléfono" : "email"}.
              </span>
              {onViewExisting ? (
                <button type="button" onClick={() => onViewExisting(duplicate)}>
                  Ver cliente existente
                </button>
              ) : null}
            </div>
          ) : null}
          <div className={styles.actions}>
            <Button type="button" variant="secondary" onClick={close} disabled={disabled}>
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={() => undefined}
              disabled={Boolean(validation) || Boolean(duplicate) || disabled}
              ariaBusy={disabled}
            >
              {disabled ? "Guardando…" : submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
