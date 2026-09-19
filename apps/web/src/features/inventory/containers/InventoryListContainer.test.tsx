import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createProduct } from "@kutana/shared/catalog/model/product.js";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import { buildMockPorts } from "../../../composition/mock.js";
import { InventoryListContainer } from "./InventoryListContainer.js";

describe("InventoryListContainer", () => {
  it("starts with an empty mock product inventory while preserving catalog filters", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <InventoryListContainer />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Draft Beer")).toBeInTheDocument());

    expect(screen.getByText("0 productos")).toBeInTheDocument();
    expect(screen.queryByText("Blonde Ale 330ml")).not.toBeInTheDocument();
  });

  it("reports the selected product object when a row edit action is clicked", async () => {
    const ports = buildMockPorts();
    await ports.products.save(
      createProduct({
        id: "product-editable",
        name: "Editable Lager",
        categoryId: "category-draft-beer",
        sku: "EDIT-LAGER",
        priceCents: 300,
        taxRateBp: 1200,
        stockKind: "unit",
      }),
      0,
    );
    const onEditProduct = vi.fn();

    render(
      <PortsProvider value={ports}>
        <InventoryListContainer onEditProduct={onEditProduct} />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Editable Lager")).toBeInTheDocument());

    const row = screen.getByRole("row", {
      name: /Editable Lager EDIT-LAGER Draft Beer/,
    });
    fireEvent.click(within(row).getByRole("button", { name: "Editar producto Editable Lager" }));

    expect(onEditProduct).toHaveBeenCalledOnce();
    expect(onEditProduct.mock.calls[0]![0]).toMatchObject({
      name: "Editable Lager",
      sku: "EDIT-LAGER",
    });
  });

  it("removes a product from inventory using the trash icon", async () => {
    const ports = buildMockPorts();
    const saved = await ports.products.save(
      createProduct({
        id: "product-delete",
        name: "Delete Lager",
        categoryId: "category-draft-beer",
        sku: "DELETE-LAGER",
        priceCents: 300,
        taxRateBp: 1200,
        stockKind: "unit",
      }),
      0,
    );

    render(
      <PortsProvider value={ports}>
        <InventoryListContainer />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Delete Lager")).toBeInTheDocument());
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const row = screen.getByRole("row", { name: /Delete Lager DELETE-LAGER Draft Beer/ });
    fireEvent.click(within(row).getByRole("button", { name: "Más acciones para Delete Lager" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar" }));

    await waitFor(() => expect(screen.queryByText("Delete Lager")).not.toBeInTheDocument());
    await expect(ports.products.findById(saved.id)).resolves.toMatchObject({ active: false });
  });
});
