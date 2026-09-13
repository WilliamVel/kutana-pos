import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import type { Ports } from "../../../composition/ports.js";
import { buildMockPorts } from "../../../composition/mock.js";
import { ChangePinPanel } from "./ChangePinPanel.js";

describe("ChangePinPanel", () => {
  it("renders an accessible modal and closes without navigating", () => {
    const onDone = vi.fn();
    render(<PortsProvider value={buildMockPorts()}><ChangePinPanel onDone={onDone} /></PortsProvider>);

    expect(screen.getByRole("dialog", { name: "Cambiar PIN" })).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("preserves validation and calls auth.changePin for valid PINs", async () => {
    const basePorts = buildMockPorts();
    const changePin = vi.fn(async () => undefined);
    const ports = { ...basePorts, auth: { ...basePorts.auth, changePin } } as Ports;
    render(<PortsProvider value={ports}><ChangePinPanel onDone={vi.fn()} /></PortsProvider>);

    fireEvent.change(screen.getByLabelText("PIN actual"), { target: { value: "1234" } });
    fireEvent.change(screen.getByLabelText("Nuevo PIN"), { target: { value: "5678" } });
    fireEvent.change(screen.getByLabelText("Confirmar nuevo PIN"), { target: { value: "5678" } });
    fireEvent.click(screen.getByRole("button", { name: "Actualizar PIN" }));

    await waitFor(() => expect(changePin).toHaveBeenCalledWith({ currentPin: "1234", newPin: "5678" }));
    expect(await screen.findByRole("status")).toHaveTextContent("PIN actualizado.");
  });

  it("rejects malformed or mismatched PINs without calling auth", () => {
    const basePorts = buildMockPorts();
    const changePin = vi.fn(async () => undefined);
    const ports = { ...basePorts, auth: { ...basePorts.auth, changePin } } as Ports;
    render(<PortsProvider value={ports}><ChangePinPanel onDone={vi.fn()} /></PortsProvider>);

    fireEvent.change(screen.getByLabelText("PIN actual"), { target: { value: "123" } });
    fireEvent.change(screen.getByLabelText("Nuevo PIN"), { target: { value: "5678" } });
    fireEvent.change(screen.getByLabelText("Confirmar nuevo PIN"), { target: { value: "5679" } });
    fireEvent.click(screen.getByRole("button", { name: "Actualizar PIN" }));

    expect(screen.getByRole("status")).toHaveTextContent("exactamente 4 dígitos");
    expect(changePin).not.toHaveBeenCalled();
  });
});
