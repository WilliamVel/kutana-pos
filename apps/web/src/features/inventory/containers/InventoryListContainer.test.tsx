import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import { buildMockPorts } from "../../../composition/mock.js";
import { InventoryListContainer } from "./InventoryListContainer.js";

describe("InventoryListContainer", () => {
  it("starts with the PDF product catalog and empty stock references", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <InventoryListContainer />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Cervezas")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Blonde Ale 330ml")).toBeInTheDocument());

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Productos visibles")).toBeInTheDocument();
    expect(screen.getAllByText("0ml").length).toBeGreaterThan(0);
  });

  it("reports the selected product object when a row edit action is clicked", async () => {
    const ports = buildMockPorts();
    const onEditProduct = vi.fn();

    render(
      <PortsProvider value={ports}>
        <InventoryListContainer onEditProduct={onEditProduct} />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Blonde Ale 330ml")).toBeInTheDocument());

    const row = screen.getByRole("row", {
      name: /Blonde Ale 330ml MENU-BLONDE-ALE-330 Cervezas/,
    });
    fireEvent.click(within(row).getByRole("button", { name: "Editar" }));

    expect(onEditProduct).toHaveBeenCalledOnce();
    expect(onEditProduct.mock.calls[0]![0]).toMatchObject({
      name: "Blonde Ale 330ml",
      sku: "MENU-BLONDE-ALE-330",
    });
  });
});
