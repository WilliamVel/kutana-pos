import type { AuthSession } from "@kutana/shared/auth/model/auth-session.js";
import { FormEvent, useState } from "react";
import { useAuth } from "../../../composition/PortsProvider.js";
import { Button } from "../../../design-system/atoms/Button.js";
import { Input } from "../../../design-system/atoms/Input.js";
import styles from "./LoginPanel.module.css";

export interface LoginPanelProps {
  readonly onLogin: (session: AuthSession) => void;
}

/** Authenticates an operator through the composed auth port (mock or HTTP). */
export function LoginPanel({ onLogin }: LoginPanelProps): JSX.Element {
  const auth = useAuth();
  const [operator, setOperator] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = operator.trim().length > 0 && pin.trim().length > 0 && !isSubmitting;

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    console.info("[LoginPanel] Sign-in submit", {
      operator: operator.trim(),
      hasPin: pin.trim().length > 0,
      canSubmit,
    });
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    try {
      console.info("[LoginPanel] Calling auth.login");
      onLogin(await auth.login({ operator, pin }));
      console.info("[LoginPanel] auth.login succeeded");
    } catch (error) {
      console.error("[LoginPanel] auth.login failed", error);
      setError("Operador o PIN inválido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.screen} aria-labelledby="login-title">
      <section className={styles.card}>
        <img className={styles.logo} src="/LOGOkutana.svg" alt="KUTANA" />
        <div className={styles.copy}>
          <h1 id="login-title" className={styles.title}>
            Ingreso de operador
          </h1>
          <p className={styles.subtitle}>Iniciá sesión para abrir el espacio de caja.</p>
        </div>

        <form className={styles.form} onSubmit={submit}>
          <Input
            label="Operador"
            value={operator}
            onChange={setOperator}
            placeholder="Tu nombre…"
          />
          <Input label="PIN" value={pin} onChange={setPin} type="password" placeholder="••••" />
          {error ? <p role="alert">{error}</p> : null}
          <Button type="submit" disabled={!canSubmit} onClick={() => undefined}>
            {isSubmitting ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </section>
    </main>
  );
}
