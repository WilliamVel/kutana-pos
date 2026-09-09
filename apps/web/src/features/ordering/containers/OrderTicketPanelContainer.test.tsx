import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { addLineItem } from "@kutana/shared/ordering/services/line-item-service.js";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import { buildMockPorts } from "../../../composition/mock.js";
import { OrderTicketPanelContainer } from "./OrderTicketPanelContainer.js";

describe("OrderTicketPanelContainer", () => {
  it("renders the seeded order's real line items and totals for table-1", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <OrderTicketPanelContainer tableId="table-1" />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Table 1")).toBeInTheDocument());
    expect(screen.getByText("KUTANA Pilsener 500ml")).toBeInTheDocument();
    expect(screen.getByText("Loaded Nachos")).toBeInTheDocument();
  });

  it("groups repeated products into one visible counter", async () => {
    const ports = buildMockPorts();
    const currentOrder = await ports.orders.findByTable("table-1");
    if (!currentOrder) throw new Error("expected seeded order");
    const updatedOrder = addLineItem(currentOrder, {
      productId: "product-pilsener-500",
      nameSnapshot: "KUTANA Pilsener 500ml",
      unitPriceCents: 350,
      quantity: 1,
      taxRateBp: 1200,
      pourSizeMl: 500,
    });
    await ports.orders.save(updatedOrder, currentOrder.version);

    render(
      <PortsProvider value={ports}>
        <OrderTicketPanelContainer tableId="table-1" />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("KUTANA Pilsener 500ml")).toBeInTheDocument());

    expect(screen.getAllByText("KUTANA Pilsener 500ml")).toHaveLength(1);
    expect(screen.getByText("x3")).toBeInTheDocument();
  });

  it("removes a product from the table order using the trash action", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <OrderTicketPanelContainer tableId="table-1" />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Loaded Nachos")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Quitar producto Loaded Nachos" }));

    await waitFor(() => expect(screen.queryByText("Loaded Nachos")).not.toBeInTheDocument());
    const order = await ports.orders.findByTable("table-1");
    expect(order?.lineItems.some((line) => line.nameSnapshot === "Loaded Nachos")).toBe(false);
  });

  it("closes an order and frees the table when the last product is removed", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <OrderTicketPanelContainer tableId="table-1" />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Loaded Nachos")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Quitar producto Loaded Nachos" }));
    await waitFor(() => expect(screen.queryByText("Loaded Nachos")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Quitar producto KUTANA Pilsener 500ml" }));

    await waitFor(async () => expect((await ports.orders.findByTable("table-1"))?.status).toBe("paid"));
    await waitFor(async () =>
      expect(await ports.tables.findById("table-1")).toMatchObject({
        status: "free",
        currentOrderId: null,
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "Resumen de orden para Table 1" })).not.toBeInTheDocument(),
    );
  });

  it("updates live when OrderEvents publishes a change from another device (waiter -> register realtime)", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <OrderTicketPanelContainer tableId="table-1" />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Loaded Nachos")).toBeInTheDocument());

    const currentOrder = await ports.orders.findByTable("table-1");
    if (!currentOrder) throw new Error("expected seeded order");
    const updatedOrder = addLineItem(currentOrder, {
      productId: "product-empanadas",
      nameSnapshot: "Beef Empanadas (3pc)",
      unitPriceCents: 550,
      quantity: 1,
      taxRateBp: 1200,
    });

    ports.events.publish({
      type: "order.updated",
      orderId: updatedOrder.id,
      tableId: "table-1",
      version: updatedOrder.version,
      at: new Date().toISOString(),
      payload: updatedOrder,
    });

    await waitFor(() => expect(screen.getByText("Beef Empanadas (3pc)")).toBeInTheDocument());
  });
});
