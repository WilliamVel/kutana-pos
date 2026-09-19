import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createCategory } from "@kutana/shared/catalog/model/category.js";
import { CategoryManagement } from "./CategoryManagement.js";

const props = () => ({
  onCreate: vi.fn(async () => undefined),
  onSave: vi.fn(async () => undefined),
  onDelete: vi.fn(async () => undefined),
  onReorder: vi.fn(async () => undefined),
});

describe("CategoryManagement", () => {
  it("shows compact rows and opens the create modal", () => {
    const actions = props();
    render(
      <CategoryManagement
        categories={[createCategory({ id: "cat-1", name: "Entradas", sortOrder: 1 })]}
        {...actions}
        productCounts={{ "cat-1": 3 }}
      />,
    );
    expect(screen.getByText("Entradas")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Nueva categoría/ }));
    expect(screen.getByRole("dialog", { name: "Nueva categoría" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre de la categoría")).toHaveFocus();
  });

  it("validates duplicates and submits a trimmed new category", async () => {
    const actions = props();
    render(
      <CategoryManagement
        categories={[createCategory({ id: "cat-1", name: "Entradas", sortOrder: 1 })]}
        {...actions}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Nueva categoría/ }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Nombre de la categoría"), {
      target: { value: " entradas " },
    });
    expect(screen.getByText("Ya existe una categoría con este nombre.")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Nombre de la categoría"), {
      target: { value: " Postres " },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Crear categoría" }));
    expect(actions.onCreate).toHaveBeenCalledWith({ name: "Postres", sortOrder: 2 });
  });

  it("edits only after explicit action and does not enable save without changes", () => {
    const actions = props();
    render(
      <CategoryManagement
        categories={[createCategory({ id: "cat-1", name: "Entradas", sortOrder: 1 })]}
        {...actions}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    const dialog = screen.getByRole("dialog", { name: "Editar categoría" });
    expect(within(dialog).getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("Nombre de la categoría"), {
      target: { value: "Platos" },
    });
    expect(within(dialog).getByRole("button", { name: "Guardar cambios" })).not.toBeDisabled();
  });
});
