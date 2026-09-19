import type { AuthSession } from "@kutana/shared/auth/model/auth-session.js";
import { FormEvent, useRef, useState } from "react";
import { useAuth } from "../../../composition/PortsProvider.js";
import { Button } from "../../../design-system/atoms/Button.js";
import styles from "./LoginPanel.module.css";

export interface LoginPanelProps {
  readonly onLogin: (session: AuthSession) => void;
  readonly notice?: string | null;
}

/** Authenticates an operator through the composed auth port (mock or HTTP). */
export function LoginPanel({ onLogin, notice = null }: LoginPanelProps): JSX.Element {
  const auth = useAuth();
  const [operator, setOperator] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  const isOperatorValid = operator.trim().length > 0;
  const isPinValid = /^\d{4}$/.test(pin);
  const canSubmit = isOperatorValid && isPinValid && !isSubmitting;

  const updatePin = (value: string): void => {
    // Keep the UI aligned with the existing backend contract: exactly four
    // numeric digits, without ever logging or persisting the PIN.
    setPin(value.replace(/\D/g, "").slice(0, 4));
  };

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    try {
      onLogin(await auth.login({ operator, pin }));
    } catch {
      setError(
        "Usuario o PIN inválido. Si olvidaste tu PIN, pedile a un administrador que lo restablezca.",
      );
      window.requestAnimationFrame(() => {
        pinRef.current?.focus();
        pinRef.current?.select();
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const operatorError =
    !isOperatorValid && operator.length > 0 ? "Ingresa tu nombre o código de usuario." : undefined;
  const pinError = !isPinValid && pin.length > 0 ? "El PIN debe tener 4 dígitos." : undefined;

  return (
    <main className={styles.screen} aria-labelledby="login-title">
      <section className={styles.card}>
        <img className={styles.logo} src="/Kutana_navbar_transparente.svg" alt="KUTANA" />
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Espacio de caja</p>
          <h1 id="login-title" className={styles.title}>
            Iniciar sesión
          </h1>
          <p className={styles.subtitle}>Inicia sesión para abrir el espacio de caja</p>
        </div>

        <form className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-operator">
              Usuario
            </label>
            <input
              id="login-operator"
              name="operator"
              className={styles.input}
              value={operator}
              onChange={(event) => setOperator(event.target.value)}
              placeholder="Nombre o código de usuario"
              autoComplete="username"
              autoFocus
              aria-invalid={Boolean(operatorError)}
              aria-describedby={operatorError ? "operator-error" : undefined}
            />
            {operatorError ? (
              <span id="operator-error" className={styles.fieldError}>
                {operatorError}
              </span>
            ) : null}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-pin">
              PIN
            </label>
            <div className={styles.pinControl}>
              <input
                ref={pinRef}
                id="login-pin"
                name="pin"
                className={styles.input}
                value={pin}
                onChange={(event) => updatePin(event.target.value)}
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoComplete="current-password"
                aria-invalid={Boolean(pinError || error)}
                aria-describedby={pinError ? "pin-error" : error ? "login-error" : undefined}
              />
              <button
                type="button"
                className={styles.visibilityButton}
                onClick={() => setShowPin((visible) => !visible)}
                aria-label={showPin ? "Ocultar PIN" : "Mostrar PIN"}
                aria-pressed={showPin}
              >
                {showPin ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {pinError ? (
              <span id="pin-error" className={styles.fieldError}>
                {pinError}
              </span>
            ) : null}
          </div>

          {notice ? (
            <p className={styles.notice} role="status" aria-live="polite">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p id="login-error" className={styles.error} role="alert" aria-live="assertive">
              {error}
            </p>
          ) : null}
          {!canSubmit && !isSubmitting && !error ? (
            <p className={styles.helper}>Completa usuario y PIN para continuar.</p>
          ) : null}
          <div className={styles.submitRow}>
            <Button type="submit" disabled={!canSubmit} onClick={() => undefined}>
              {isSubmitting ? (
                <span className={styles.loadingLabel} role="status" aria-live="polite">
                  <span className={styles.spinner} aria-hidden="true" />
                  Ingresando…
                </span>
              ) : (
                "Ingresar"
              )}
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
