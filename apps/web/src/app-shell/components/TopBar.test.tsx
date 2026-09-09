import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TopBar } from "./TopBar.js";

describe("TopBar", () => {
  it("renders the logo heading and every screen tab", () => {
    render(<TopBar currentScreen="inventory" onNavigate={vi.fn()} onLogout={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "KUTANA" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "KUTANA" })).toHaveAttribute("src", "/LOGOkutana.svg");
    for (const label of ["Inventario", "Órdenes", "Clientes", "Cuentas por cobrar"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Cuenta Operador" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir menú de navegación" })).toBeInTheDocument();
    expect(document.querySelector('[data-icon="inventory"]')).not.toBeNull();
    expect(document.querySelector('[data-icon="orders"]')).not.toBeNull();
  });

  it("marks the current screen's tab as the active page", () => {
    render(<TopBar currentScreen="register" onNavigate={vi.fn()} onLogout={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Órdenes" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Inventario" })).not.toHaveAttribute("aria-current");
  });

  it("calls onNavigate with the tapped screen id", () => {
    const onNavigate = vi.fn();
    render(<TopBar currentScreen="inventory" onNavigate={onNavigate} onLogout={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Órdenes" }));

    expect(onNavigate).toHaveBeenCalledWith("register");
  });

  it("opens the account menu and calls onLogout", () => {
    const onLogout = vi.fn();
    render(<TopBar currentScreen="inventory" onNavigate={vi.fn()} onLogout={onLogout} />);

    fireEvent.click(screen.getByRole("button", { name: "Cuenta Operador" }));

    expect(screen.getByText("Sesión activa")).toBeInTheDocument();
    expect(screen.getByText("Ingreso de operador habilitado")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(onLogout).toHaveBeenCalledOnce();
  });

  it("toggles the mobile navigation menu", () => {
    render(<TopBar currentScreen="inventory" onNavigate={vi.fn()} onLogout={vi.fn()} />);

    const menuButton = screen.getByRole("button", { name: "Abrir menú de navegación" });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(menuButton);

    expect(menuButton).toHaveAttribute("aria-expanded", "true");
  });
});
