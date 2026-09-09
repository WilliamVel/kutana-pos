import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createOrder } from "@kutana/shared/ordering/model/order.js";
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

  it("hides empty orders from the active order list on reload", async () => {
    const ports = buildMockPorts();
    const { rerender } = render(
      <PortsProvider value={ports}>
        <OrdersOverviewContainer selectedTableId={null} onSelectTable={vi.fn()} reloadKey={0} />
      </PortsProvider>,
    );
    await waitFor(() => expect(screen.getByText("Table 2")).toBeInTheDocument());

    await ports.orders.save(createOrder({ id: "empty-order", tableId: "table-4" }), 0);
    rerender(
      <PortsProvider value={ports}>
        <OrdersOverviewContainer selectedTableId={null} onSelectTable={vi.fn()} reloadKey={1} />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Table 2")).toBeInTheDocument());
    expect(screen.queryByText("Table 4")).not.toBeInTheDocument();
  });

  it("removes an order row when a realtime update closes it", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <OrdersOverviewContainer selectedTableId={null} onSelectTable={vi.fn()} />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Table 1")).toBeInTheDocument());
    const currentOrder = await ports.orders.findByTable("table-1");
    if (!currentOrder) throw new Error("expected seeded order");
    const saved = await ports.orders.save(
      { ...currentOrder, status: "paid", closedAt: "2026-08-30T13:00:00.000Z" },
      currentOrder.version,
    );
    ports.events.publish({
      type: "order.closed",
      orderId: saved.id,
      tableId: "table-1",
      version: saved.version,
      at: "2026-08-30T13:00:00.000Z",
      payload: saved,
    });

    await waitFor(() => expect(screen.queryByText("Table 1")).not.toBeInTheDocument());
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
