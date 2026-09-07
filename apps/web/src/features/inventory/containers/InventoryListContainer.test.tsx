import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
