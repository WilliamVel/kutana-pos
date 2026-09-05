import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginPanel } from "./LoginPanel.js";

describe("LoginPanel", () => {
  it("renders the KUTANA logo and keeps sign in disabled until credentials are present", () => {
    render(<LoginPanel onLogin={vi.fn()} />);

    expect(screen.getByRole("img", { name: "KUTANA" })).toHaveAttribute("src", "/LOGOkutana.svg");
    expect(screen.getByRole("heading", { name: "Ingreso de operador" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeDisabled();
  });

  it("calls onLogin after the operator enters local credentials", () => {
    const onLogin = vi.fn();
    render(<LoginPanel onLogin={onLogin} />);

    fireEvent.change(screen.getByLabelText("Operador"), { target: { value: "Mina" } });
    fireEvent.change(screen.getByLabelText("PIN"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(onLogin).toHaveBeenCalledTimes(1);
  });
});
