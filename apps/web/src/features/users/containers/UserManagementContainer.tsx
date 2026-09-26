import { useCallback, useEffect, useState, type FormEvent } from "react";
import { isValidPin, type AuthRole } from "@kutana/shared/auth/model/auth-session.js";
import type { ManagedAuthUser } from "@kutana/shared/auth/model/user-management.js";
import { useUserManagement } from "../../../composition/PortsProvider.js";
import { Button } from "../../../design-system/atoms/Button.js";
import { Input } from "../../../design-system/atoms/Input.js";
import styles from "./UserManagementContainer.module.css";

export function UserManagementContainer(): JSX.Element {
  const usersPort = useUserManagement();
  const [users, setUsers] = useState<readonly ManagedAuthUser[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<AuthRole>("operator");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
      const [resetPins, setResetPins] = useState<Record<string, string>>({});

  const load = useCallback(async (): Promise<void> => {
    setUsers(await usersPort.listUsers());
  }, [usersPort]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!displayName.trim() || !isValidPin(pin)) return;
    setBusy(true);
    setActiveAction("create");
    setMessage(null);
    try {
      await usersPort.createUser({ displayName: displayName.trim(), role, pin });
      setDisplayName("");
      setPin("");
      setRole("operator");
      setMessage("Usuario creado.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear el usuario.");
    } finally {
      setActiveAction(null);
      setBusy(false);
    }
  }

  async function resetPin(user: ManagedAuthUser): Promise<void> {
        const newPin = resetPins[user.id] ?? "";
        if (!isValidPin(newPin)) return;
        setBusy(true);
        setActiveAction(`reset:${user.id}`);
        setMessage(null);
        try {
          if (!usersPort.resetPin) throw new Error("La función de restablecimiento no está disponible.");
          await usersPort.resetPin({ userId: user.id, newPin });
          setResetPins((pins) => ({ ...pins, [user.id]: "" }));
          setMessage(`PIN de ${user.displayName} restablecido.`);
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "No se pudo restablecer el PIN.");
        } finally {
          setActiveAction(null);
          setBusy(false);
        }
      }

      async function deactivate(user: ManagedAuthUser): Promise<void> {
    setBusy(true);
    setActiveAction(`deactivate:${user.id}`);
    setMessage(null);
    try {
      await usersPort.deactivateUser(user.id);
      setMessage("Usuario desactivado.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo desactivar el usuario.");
    } finally {
      setActiveAction(null);
      setBusy(false);
    }
  }

  return (
    <div className={styles.screen}>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Administración</p>
        <h2>Usuarios</h2>
        <p>Creá usuarios y administradores. Las cuentas se desactivan sin borrar su historial.</p>
        <form className={styles.form} aria-label="Formulario de usuario" onSubmit={(event) => void submit(event)}>
          <Input label="Nombre visible" value={displayName} onChange={setDisplayName} />
          <Input label="PIN" type="password" inputMode="numeric" value={pin} onChange={setPin} />
          <label className={styles.selectLabel}>
            Rol
            <select value={role} onChange={(event) => setRole(event.target.value as AuthRole)}>
              <option value="operator">Usuario</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          <Button type="submit" onClick={() => undefined} loading={activeAction === "create"} disabled={busy || !displayName.trim() || !isValidPin(pin)}>
            Crear usuario
          </Button>
        </form>
        {message ? <p role="status" className={styles.message}>{message}</p> : null}
      </section>

      <section className={styles.panel} aria-label="Usuarios registrados">
        <h2>Usuarios registrados</h2>
        <ul className={styles.list}>
          {users.map((user) => (
            <li key={user.id} className={styles.userRow}>
              <div>
                <strong>{user.displayName}</strong>
                <span>{user.role === "admin" ? "Administrador" : "Usuario"}</span>
                {user.deactivatedAt ? <span className={styles.inactive}>Desactivado</span> : null}
              </div>
              {!user.deactivatedAt ? (
                    <>
                <Input label={`Nuevo PIN para ${user.displayName}`} type="password" inputMode="numeric" value={resetPins[user.id] ?? ""} onChange={(value) => setResetPins((pins) => ({ ...pins, [user.id]: value }))} />
                    <Button variant="secondary" onClick={() => void resetPin(user)} loading={activeAction === `reset:${user.id}`} disabled={busy || !isValidPin(resetPins[user.id] ?? "")}>
                      Restablecer PIN
                    </Button>
                    <Button variant="secondary" onClick={() => void deactivate(user)} loading={activeAction === `deactivate:${user.id}`} disabled={busy}>
                  Desactivar
                </Button>
              </>
                  ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
