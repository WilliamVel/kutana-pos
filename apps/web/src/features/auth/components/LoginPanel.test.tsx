import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import { buildMockPorts } from "../../../composition/mock.js";
import { LoginPanel } from "./LoginPanel.js";

describe("LoginPanel", () => {
  it("renders the KUTANA logo and keeps sign in disabled until credentials are present", () => {
    render(
      <PortsProvider value={buildMockPorts()}>
        <LoginPanel onLogin={vi.fn()} />
      </PortsProvider>,
    );

    expect(screen.getByRole("img", { name: "KUTANA" })).toHaveAttribute("src", "/LOGOkutana.svg");
    expect(screen.getByRole("heading", { name: "Ingreso de operador" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeDisabled();
  });

  it("calls onLogin after the operator enters valid credentials", async () => {
    const onLogin = vi.fn();
    render(
      <PortsProvider value={buildMockPorts()}>
        <LoginPanel onLogin={onLogin} />
      </PortsProvider>,
    );

    fireEvent.change(screen.getByLabelText("Operador"), { target: { value: "Mina" } });
    fireEvent.change(screen.getByLabelText("PIN"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledTimes(1));
  });

  it("shows an auth error and does not log in for arbitrary credentials", async () => {
    const onLogin = vi.fn();
    render(
      <PortsProvider value={buildMockPorts()}>
        <LoginPanel onLogin={onLogin} />
      </PortsProvider>,
    );

    fireEvent.change(screen.getByLabelText("Operador"), { target: { value: "Anyone" } });
    fireEvent.change(screen.getByLabelText("PIN"), { target: { value: "9999" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Operador o PIN inválido.");
    expect(onLogin).not.toHaveBeenCalled();
  });
});
