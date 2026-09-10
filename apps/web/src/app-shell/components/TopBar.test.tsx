import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@kutana/shared/auth/model/auth-session.js";
import { TopBar } from "./TopBar.js";

const ADMIN_SESSION: AuthSession = {
  operatorId: "operator-mina",
  displayName: "Mina",
  role: "admin",
  token: "signed-token",
  expiresAt: "2025-01-01T00:15:00.000Z",
  refreshToken: "refresh-token",
  refreshExpiresAt: "2025-01-08T00:00:00.000Z",
};

describe("TopBar", () => {
  it("renders the logo heading and every screen tab", () => {
    render(
      <TopBar
        currentScreen="inventory"
        session={ADMIN_SESSION}
        onNavigate={vi.fn()}
        onLogout={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "KUTANA" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "KUTANA" })).toHaveAttribute("src", "/LOGOkutana.svg");
    for (const label of ["Inventario", "Órdenes", "Clientes", "Cuentas por cobrar", "Usuarios"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /Cuenta\s+Mina/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir menú de navegación" })).toBeInTheDocument();
    expect(document.querySelector('[data-icon="inventory"]')).not.toBeNull();
    expect(document.querySelector('[data-icon="orders"]')).not.toBeNull();
  });

  it("marks the current screen's tab as the active page", () => {
    render(
      <TopBar
        currentScreen="register"
        session={ADMIN_SESSION}
        onNavigate={vi.fn()}
        onLogout={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Órdenes" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Inventario" })).not.toHaveAttribute("aria-current");
  });

  it("calls onNavigate with the tapped screen id", () => {
    const onNavigate = vi.fn();
    render(
      <TopBar
        currentScreen="inventory"
        session={ADMIN_SESSION}
        onNavigate={onNavigate}
        onLogout={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Órdenes" }));

    expect(onNavigate).toHaveBeenCalledWith("register");
  });

  it("opens the account menu and calls onLogout", () => {
    const onLogout = vi.fn();
    render(
      <TopBar
        currentScreen="inventory"
        session={ADMIN_SESSION}
        onNavigate={vi.fn()}
        onLogout={onLogout}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Cuenta\s+Mina/ }));

    expect(screen.getByText("Sesión activa")).toBeInTheDocument();
    expect(screen.getByText("Administrador")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(onLogout).toHaveBeenCalledOnce();
  });

  it("toggles the mobile navigation menu", () => {
    render(
      <TopBar
        currentScreen="inventory"
        session={ADMIN_SESSION}
        onNavigate={vi.fn()}
        onLogout={vi.fn()}
      />,
    );

    const menuButton = screen.getByRole("button", { name: "Abrir menú de navegación" });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(menuButton);

    expect(menuButton).toHaveAttribute("aria-expanded", "true");
  });
});
