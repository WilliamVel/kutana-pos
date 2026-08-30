import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import { buildMockPorts } from "../../../composition/mock.js";
import { OrdersOverviewContainer } from "./OrdersOverviewContainer.js";

describe("OrdersOverviewContainer", () => {
  it("lists every table that has an open order from the seed data", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <OrdersOverviewContainer selectedTableId={null} onSelectTable={vi.fn()} />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Table 1")).toBeInTheDocument());
    expect(screen.getByText("Table 2")).toBeInTheDocument();
    expect(screen.getByText("Table 3")).toBeInTheDocument();
  });

  it("calls onSelectTable with the real table id when a row is clicked", async () => {
    const ports = buildMockPorts();
    const onSelectTable = vi.fn();
    render(
      <PortsProvider value={ports}>
        <OrdersOverviewContainer selectedTableId={null} onSelectTable={onSelectTable} />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Table 1")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Table 1/ }));

    expect(onSelectTable).toHaveBeenCalledWith("table-1");
  });
});
