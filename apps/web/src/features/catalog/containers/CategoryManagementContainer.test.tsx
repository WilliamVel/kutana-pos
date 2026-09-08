import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import { buildMockPorts } from "../../../composition/mock.js";
import { CategoryManagementContainer } from "./CategoryManagementContainer.js";

describe("CategoryManagementContainer", () => {
  it("loads mock categories through CategoryRepository and creates a new category", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <CategoryManagementContainer />
      </PortsProvider>,
    );

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Categorías" })).toBeInTheDocument(),
    );
    expect(await screen.findByRole("form", { name: "Editar Draft Beer" })).toBeInTheDocument();

    const createForm = screen.getByRole("form", { name: "Crear categoría" });
    fireEvent.change(within(createForm).getByLabelText("Nombre"), { target: { value: "Postres" } });
    fireEvent.change(within(createForm).getByLabelText("Orden"), { target: { value: "7" } });
    fireEvent.submit(createForm);

    await waitFor(() => expect(screen.getByText("Categoría creada.")).toBeInTheDocument());
    const categories = await ports.categories.listAll();
    expect(categories.map((category) => category.name)).toContain("Postres");
  });

  it("saves edits through CategoryRepository", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <CategoryManagementContainer />
      </PortsProvider>,
    );

    const form = await screen.findByRole("form", { name: "Editar Draft Beer" });
    fireEvent.change(within(form).getByLabelText("Nombre"), {
      target: { value: "Draft Beer Updated" },
    });
    fireEvent.change(within(form).getByLabelText("Orden"), { target: { value: "9" } });
    fireEvent.submit(form);

    await waitFor(() => expect(screen.getByText("Categoría guardada.")).toBeInTheDocument());
    const saved = await ports.categories.findById("category-draft-beer");
    expect(saved).toMatchObject({ name: "Draft Beer Updated", sortOrder: 9 });
  });
});
