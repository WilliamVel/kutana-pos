import { useState, type FormEvent } from "react";
import { useAuth } from "../../../composition/PortsProvider.js";
import { Button } from "../../../design-system/atoms/Button.js";
import { Input } from "../../../design-system/atoms/Input.js";

export function ChangePinPanel({ onDone }: { readonly onDone: () => void }): JSX.Element {
  const auth = useAuth();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!/^\d{4}$/.test(currentPin) || !/^\d{4}$/.test(newPin) || newPin !== confirmation) {
      setMessage("El PIN debe tener exactamente 4 dígitos y coincidir con la confirmación.");
      return;
    }
    try {
      await auth.changePin({ currentPin, newPin });
      setMessage("PIN actualizado.");
      setCurrentPin("");
      setNewPin("");
      setConfirmation("");
    } catch {
      setMessage("No se pudo actualizar el PIN. Verificá tu PIN actual.");
    }
  }

  return (
    <section aria-labelledby="change-pin-title">
      <h2 id="change-pin-title">Cambiar PIN</h2>
      <p>Usá tu PIN actual para definir uno nuevo.</p>
      <form onSubmit={(event) => void submit(event)}>
        <Input label="PIN actual" type="password" inputMode="numeric" value={currentPin} onChange={setCurrentPin} />
        <Input label="Nuevo PIN" type="password" inputMode="numeric" value={newPin} onChange={setNewPin} />
        <Input label="Confirmar nuevo PIN" type="password" inputMode="numeric" value={confirmation} onChange={setConfirmation} />
        {message ? <p role="status">{message}</p> : null}
        <Button type="submit" onClick={() => undefined}>Actualizar PIN</Button>
        <Button type="button" variant="secondary" onClick={onDone}>Volver</Button>
      </form>
    </section>
  );
}
