import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createCategory } from "@kutana/shared/catalog/model/category.js";
import { CategoryManagement } from "./CategoryManagement.js";

describe("CategoryManagement", () => {
  it("lists categories sorted by sort order then name", () => {
    render(
      <CategoryManagement
        categories={[
          createCategory({ id: "cat-b", name: "Bebidas", sortOrder: 2 }),
          createCategory({ id: "cat-a", name: "Cervezas", sortOrder: 1 }),
        ]}
        onCreate={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(
      screen.getAllByDisplayValue(/Cervezas|Bebidas/).map((input) => input.getAttribute("value")),
    ).toEqual(["Cervezas", "Bebidas"]);
  });

  it("submits new categories", () => {
    const onCreate = vi.fn();
    render(
      <CategoryManagement categories={[]} onCreate={onCreate} onSave={vi.fn()} onDelete={vi.fn()} />,
    );

    const form = screen.getByRole("form", { name: "Crear categoría" });
    fireEvent.change(within(form).getByLabelText("Nombre"), { target: { value: "Postres" } });
    fireEvent.change(within(form).getByLabelText("Orden"), { target: { value: "7" } });
    fireEvent.submit(form);

    expect(onCreate).toHaveBeenCalledWith({ name: "Postres", sortOrder: 7 });
  });

  it("submits edited categories", () => {
    const onSave = vi.fn();
    render(
      <CategoryManagement
        categories={[createCategory({ id: "cat-1", name: "Entradas", sortOrder: 4 })]}
        onCreate={vi.fn()}
        onSave={onSave}
        onDelete={vi.fn()}
      />,
    );

    const form = screen.getByRole("form", { name: "Editar Entradas" });
    fireEvent.change(within(form).getByLabelText("Nombre"), { target: { value: "Para picar" } });
    fireEvent.change(within(form).getByLabelText("Orden"), { target: { value: "3" } });
    fireEvent.submit(form);

    expect(onSave).toHaveBeenCalledWith({ id: "cat-1", name: "Para picar", sortOrder: 3 });
  });
});
