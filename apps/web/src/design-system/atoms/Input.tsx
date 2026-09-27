import { forwardRef, useId } from "react";
import styles from "./Input.module.css";

export interface InputProps {
  readonly id?: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly type?: "text" | "number" | "password" | "email" | "tel" | "date";
  readonly name?: string;
  readonly autoComplete?: string;
  readonly inputMode?: "decimal" | "numeric" | "search" | "text" | "tel" | "email";
  readonly multiline?: boolean;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly min?: number;
  readonly maxLength?: number;
  readonly onBlur?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    id,
    label,
    value,
    onChange,
    error,
    type = "text",
    name,
    autoComplete,
    inputMode,
    multiline = false,
    placeholder,
    required = false,
    min,
    maxLength,
    onBlur,
  }: InputProps,
  ref,
): JSX.Element {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = useId();
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={inputId}
          name={name}
          autoComplete={autoComplete}
          className={styles.input}
          value={value}
          placeholder={placeholder}
          required={required}
          maxLength={maxLength}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
      ) : (
        <input
          ref={ref}
          id={inputId}
          name={name}
          autoComplete={autoComplete}
          inputMode={inputMode}
          className={styles.input}
          type={type}
          value={value}
          placeholder={placeholder}
          required={required}
          min={min}
          maxLength={maxLength}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
      )}
      {error ? (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
});
