import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CustomerForm } from "./CustomerForm.js";

describe("CustomerForm", () => {
  it("submits customer contact details", () => {
    const onSubmit = vi.fn();
    render(<CustomerForm onSubmit={onSubmit} disabled={false} message={null} />);

    fireEvent.change(screen.getByLabelText("Nombre visible"), {
      target: { value: "Ada Lovelace" },
    });
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "555-0101" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText("Notas"), {
      target: { value: "Prefers table near the bar" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear cliente" }));

    expect(onSubmit).toHaveBeenCalledWith({
      displayName: "Ada Lovelace",
      phone: "555-0101",
      email: "ada@example.com",
      notes: "Prefers table near the bar",
    });
  });

  it("keeps create disabled until a display name is present", () => {
    render(<CustomerForm onSubmit={vi.fn()} disabled={false} message={null} />);

    expect(screen.getByRole("button", { name: "Crear cliente" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Nombre visible"), { target: { value: "Lina M." } });

    expect(screen.getByRole("button", { name: "Crear cliente" })).toBeEnabled();
  });
});
