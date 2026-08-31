import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TopBar } from "./TopBar.js";

describe("TopBar", () => {
  it("renders the logo heading and every screen tab", () => {
    render(<TopBar currentScreen="inventory" onNavigate={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "KUTANA" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "KUTANA" })).toHaveAttribute("src", "/LOGOkutana.svg");
    for (const label of ["Inventory", "Add product", "Register"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("marks the current screen's tab as the active page", () => {
    render(<TopBar currentScreen="register" onNavigate={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Register" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Inventory" })).not.toHaveAttribute("aria-current");
  });

  it("calls onNavigate with the tapped screen id", () => {
    const onNavigate = vi.fn();
    render(<TopBar currentScreen="inventory" onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    expect(onNavigate).toHaveBeenCalledWith("register");
  });
});
