import { useId } from "react";
import styles from "./Input.module.css";

export interface InputProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly type?: "text" | "number" | "password";
  /** Renders a `<textarea>` instead of an `<input>` for longer free-text content (e.g. a description). */
  readonly multiline?: boolean;
  readonly placeholder?: string;
}

/** Purely presentational atom: props in, markup out. No port access. */
export function Input({
  label,
  value,
  onChange,
  error,
  type = "text",
  multiline = false,
  placeholder,
}: InputProps): JSX.Element {
  const inputId = useId();
  const errorId = useId();

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={inputId}
          className={styles.input}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
      ) : (
        <input
          id={inputId}
          className={styles.input}
          type={type}
          value={value}
          placeholder={placeholder}
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
}
