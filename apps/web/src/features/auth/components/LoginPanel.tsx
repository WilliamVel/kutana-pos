import { FormEvent, useState } from "react";
import { Button } from "../../../design-system/atoms/Button.js";
import { Input } from "../../../design-system/atoms/Input.js";
import styles from "./LoginPanel.module.css";

export interface LoginPanelProps {
  readonly onLogin: () => void;
}

/**
 * Local-only login gate for the demo shell. It does not authenticate against a
 * backend yet; it only separates the operator entry point from the POS screens.
 */
export function LoginPanel({ onLogin }: LoginPanelProps): JSX.Element {
  const [operator, setOperator] = useState("");
  const [pin, setPin] = useState("");

  const canSubmit = operator.trim().length > 0 && pin.trim().length > 0;

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (canSubmit) onLogin();
  };

  return (
    <main className={styles.screen} aria-labelledby="login-title">
      <section className={styles.card}>
        <img className={styles.logo} src="/LOGOkutana.svg" alt="KUTANA" />
        <div className={styles.copy}>
          <h1 id="login-title" className={styles.title}>
            Operator login
          </h1>
          <p className={styles.subtitle}>Sign in to open the POS workspace.</p>
        </div>

        <form className={styles.form} onSubmit={submit}>
          <Input label="Operator" value={operator} onChange={setOperator} placeholder="Your name" />
          <Input label="PIN" value={pin} onChange={setPin} type="password" placeholder="••••" />
          <Button type="submit" disabled={!canSubmit} onClick={() => undefined}>
            Sign in
          </Button>
        </form>
      </section>
    </main>
  );
}
