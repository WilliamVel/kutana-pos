import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import { buildMockPorts } from "../../../composition/mock.js";
import { NewOrderContainer } from "./NewOrderContainer.js";

describe("NewOrderContainer", () => {
  it("offers only the seeded free tables in the picker", async () => {
    render(
      <PortsProvider value={buildMockPorts()}>
        <NewOrderContainer onCreated={vi.fn()} />
      </PortsProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Nueva orden" }));

    await waitFor(() => expect(screen.getByText("Table 4")).toBeInTheDocument());
    expect(screen.getByText("Table 5")).toBeInTheDocument();
    expect(screen.getByText("Table 6")).toBeInTheDocument();
    expect(screen.queryByText("Table 1")).not.toBeInTheDocument();
  });

  it("creates an empty order, occupies the table, and reports the table id", async () => {
    const ports = buildMockPorts();
    const onCreated = vi.fn();
    render(
      <PortsProvider value={ports}>
        <NewOrderContainer onCreated={onCreated} />
      </PortsProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Nueva orden" }));
    fireEvent.click(await screen.findByRole("button", { name: "Table 4" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("table-4"));

    const order = await ports.orders.findByTable("table-4");
    expect(order).not.toBeNull();
    expect(order?.lineItems).toHaveLength(0);

    const table = await ports.tables.findById("table-4");
    expect(table?.status).toBe("active");
    expect(table?.currentOrderId).toBe(order?.id);

    // The table is no longer offered once occupied.
    await waitFor(() => expect(screen.queryByText("Table 4")).not.toBeInTheDocument());
  });
});
