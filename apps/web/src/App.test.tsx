import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App.js";
import { PortsProvider } from "./composition/PortsProvider.js";
import { buildMockPorts } from "./composition/mock.js";

describe("App", () => {
  it("renders the login gate first, then opens the KUTANA POS workspace", async () => {
    render(
      <PortsProvider value={buildMockPorts()}>
        <App />
      </PortsProvider>,
    );

    expect(screen.getByRole("heading", { name: "Ingreso de operador" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Operador"), { target: { value: "Mina" } });
    fireEvent.change(screen.getByLabelText("PIN"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Inventario" })).toBeInTheDocument(),
    );
    expect(screen.getByRole("img", { name: "KUTANA" })).toHaveAttribute("src", "/LOGOkutana.svg");
    expect(screen.getByRole("button", { name: "Inventario" })).toBeInTheDocument();
  });

  it("opens customer management from the top bar", async () => {
    render(
      <PortsProvider value={buildMockPorts()}>
        <App />
      </PortsProvider>,
    );

    fireEvent.change(screen.getByLabelText("Operador"), { target: { value: "Mina" } });
    fireEvent.change(screen.getByLabelText("PIN"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Clientes" })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Clientes" }));

    expect(screen.getByRole("heading", { name: "Clientes" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Formulario de cliente" })).toBeInTheDocument();
  });

  it("logs out from the account menu", async () => {
    render(
      <PortsProvider value={buildMockPorts()}>
        <App />
      </PortsProvider>,
    );

    fireEvent.change(screen.getByLabelText("Operador"), { target: { value: "Mina" } });
    fireEvent.change(screen.getByLabelText("PIN"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Cuenta\s+Operador/ })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Cuenta\s+Operador/ }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(screen.getByRole("heading", { name: "Ingreso de operador" })).toBeInTheDocument();
  });
});
