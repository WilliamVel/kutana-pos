import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import { buildMockPorts } from "../../../composition/mock.js";
import { CustomerManagementContainer } from "./CustomerManagementContainer.js";

describe("CustomerManagementContainer", () => {
  it("creates a customer through the customer port and lists it for future selection", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <CustomerManagementContainer />
      </PortsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Nuevo cliente" }));
    fireEvent.change(screen.getByLabelText("Nombre visible"), {
      target: { value: "Ada Lovelace" },
    });
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "555-0101" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear cliente" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Cliente creado."));
    await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument());
    expect(
      (await ports.customers.listAll()).some((customer) => customer.displayName === "Ada Lovelace"),
    ).toBe(true);
  });

  it("filters customers through the customer port and edits an existing customer", async () => {
    const ports = buildMockPorts();
    await ports.customers.save({
      id: "customer-ada",
      displayName: "Ada Lovelace",
      phone: "555-0101",
      email: "ada@example.com",
      notes: null,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    });
    await ports.customers.save({
      id: "customer-grace",
      displayName: "Grace Hopper",
      phone: null,
      email: null,
      notes: null,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    });

    render(
      <PortsProvider value={ports}>
        <CustomerManagementContainer />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Ada Lovelace")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Buscar clientes por nombre"), {
      target: { value: "ada" },
    });
    await waitFor(() => expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument());
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Editar cliente Ada Lovelace" }));
    fireEvent.change(screen.getByLabelText("Nombre visible"), {
      target: { value: "Ada Byron" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Cliente actualizado."),
    );
    await expect(ports.customers.findById("customer-ada")).resolves.toMatchObject({
      displayName: "Ada Byron",
    });
  });

  it("deletes a customer from the saved list using the trash icon", async () => {
    const ports = buildMockPorts();
    await ports.customers.save({
      id: "customer-delete",
      displayName: "Cliente Temporal",
      phone: null,
      email: null,
      notes: null,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    });

    render(
      <PortsProvider value={ports}>
        <CustomerManagementContainer />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Cliente Temporal")).toBeInTheDocument());
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("group"));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar cliente Cliente Temporal" }));

    await waitFor(() => expect(screen.queryByText("Cliente Temporal")).not.toBeInTheDocument());
    await expect(ports.customers.findById("customer-delete")).resolves.toBeNull();
  });
});
