import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import { buildMockPorts } from "../../../composition/mock.js";
import { InventoryListContainer } from "./InventoryListContainer.js";

describe("InventoryListContainer", () => {
  it("loads real seed products from the mock ProductRepository and renders KUTANA volume stock correctly", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <InventoryListContainer />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("KUTANA Pilsener 500ml")).toBeInTheDocument());

    // The Pilsener 500/750/1000 all share one keg (30000ml seeded) — the
    // draft-beer rows must show millilitres, never a "unit" count.
    await waitFor(() => expect(screen.getAllByText("30000ml").length).toBeGreaterThan(0));
    expect(screen.getByText("48 units")).toBeInTheDocument(); // bottled stout
  });
});
