import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import { buildMockPorts } from "../../../composition/mock.js";
import { CategoryManagementContainer } from "./CategoryManagementContainer.js";

describe("CategoryManagementContainer", () => {
  it("loads counts, creates, updates and deletes through repositories", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <CategoryManagementContainer />
      </PortsProvider>,
    );
    expect(await screen.findByRole("heading", { name: "Categorías" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Nueva categoría/ }));
    fireEvent.change(screen.getByLabelText("Nombre de la categoría"), {
      target: { value: "Postres" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear categoría" }));
    await waitFor(() => expect(screen.getByText("Categoría creada.")).toBeInTheDocument());
    await expect(ports.categories.listAll()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Postres" })]),
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Nueva categoría/ })).not.toBeDisabled(),
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]!);
    fireEvent.change(screen.getByLabelText("Nombre de la categoría"), {
      target: { value: "Bebidas" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(screen.getByText("Categoría actualizada.")).toBeInTheDocument());
  });

  it("protects a category that contains products", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <CategoryManagementContainer />
      </PortsProvider>,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Acciones para Draft Beer/ })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Acciones para Draft Beer/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar" }));
    expect(
      await screen.findByRole("dialog", { name: "¿Eliminar esta categoría?" }),
    ).toHaveTextContent("Esta acción no se puede deshacer.");
    expect(screen.getByRole("button", { name: "Eliminar categoría" })).toBeInTheDocument();
  });
});
