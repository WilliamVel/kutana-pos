import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import { buildHttpPorts } from "../../../composition/http.js";
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

  it("posts credentials through the HTTP auth port when the operator clicks sign in", async () => {
    const onLogin = vi.fn();
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          operatorId: "operator-mina",
          displayName: "Mina",
          token: "signed-token",
          expiresAt: "2026-01-01T00:15:00.000Z",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    ) as unknown as typeof fetch;

    render(
      <PortsProvider value={buildHttpPorts({ baseUrl: "http://localhost:3000", fetchImpl })}>
        <LoginPanel onLogin={onLogin} />
      </PortsProvider>,
    );

    fireEvent.change(screen.getByLabelText("Operador"), { target: { value: "Mina" } });
    fireEvent.change(screen.getByLabelText("PIN"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

    await waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ operator: "Mina", pin: "1234" }),
      }),
    );
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
