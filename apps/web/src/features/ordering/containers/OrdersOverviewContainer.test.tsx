import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import { buildMockPorts } from "../../../composition/mock.js";
import { OrdersOverviewContainer } from "./OrdersOverviewContainer.js";

describe("OrdersOverviewContainer", () => {
  it("lists only tables with an open order — table-1 from seed data, not the free tables", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <OrdersOverviewContainer selectedTableId={null} onSelectTable={vi.fn()} />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Table 1")).toBeInTheDocument());
    expect(screen.queryByText("Table 2")).not.toBeInTheDocument();
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
