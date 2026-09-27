import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Toaster, toast } from "sonner";
import { afterEach, describe, expect, it } from "vitest";
import { createAccountLineAllocation, createPersonalAccount } from "@kutana/shared/billing/model/personal-account.js";
import { addLineItem } from "@kutana/shared/ordering/services/line-item-service.js";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import { buildMockPorts } from "../../../composition/mock.js";
import { OrderTicketPanelContainer } from "./OrderTicketPanelContainer.js";

describe("OrderTicketPanelContainer", () => {
  afterEach(() => {
    act(() => toast.dismiss());
  });

  it("renders the seeded order's real line items and totals for table-1", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <OrderTicketPanelContainer tableId="table-1" />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Table 1")).toBeInTheDocument());
    expect(within(screen.getByRole("table")).getByText("KUTANA Pilsener 500ml")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("Loaded Nachos")).toBeInTheDocument();
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

    await waitFor(() => expect(within(screen.getByRole("table")).getByText("KUTANA Pilsener 500ml")).toBeInTheDocument());

    expect(within(screen.getByRole("table")).getAllByText("KUTANA Pilsener 500ml")).toHaveLength(1);
    expect(within(screen.getByRole("table")).getByText("x3")).toBeInTheDocument();
  });

  it("removes one unit from an aggregated product using the trash action", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <Toaster />
        <OrderTicketPanelContainer tableId="table-1" />
      </PortsProvider>,
    );

    await waitFor(() => expect(within(screen.getByRole("table")).getByText("KUTANA Pilsener 500ml")).toBeInTheDocument());
    expect(within(screen.getByRole("table")).getByText("x2")).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "Eliminar KUTANA Pilsener" }));

    await waitFor(() => expect(within(screen.getByRole("table")).getByText("x1")).toBeInTheDocument());
    expect(await screen.findByText("KUTANA Pilsener 500ml eliminado")).toBeInTheDocument();
    await waitFor(async () => {
      const order = await ports.orders.findByTable("table-1");
      const remainingPilsener = order?.lineItems.find((line) => line.nameSnapshot === "KUTANA Pilsener 500ml");
      expect(remainingPilsener).toMatchObject({ quantity: 1 });
      expect(order?.lineItems.map((line) => line.nameSnapshot)).toEqual([
        "KUTANA Pilsener 500ml",
        "Loaded Nachos",
      ]);
      expect(order?.lineItems).toHaveLength(2);
    });
  });

  it("hides removal for a partially assigned aggregated product while leaving another product removable", async () => {
    const ports = buildMockPorts();
    const order = await ports.orders.findByTable("table-1");
    if (!order) throw new Error("expected seeded order");
    const account = createPersonalAccount({ id: "account-assigned", orderId: order.id, freeName: "Ana" });
    await ports.personalAccounts.save(account, [createAccountLineAllocation({
      id: "allocation-assigned",
      accountId: account.id,
      lineItemId: order.lineItems[0]!.id,
      quantity: 1,
    })], 0);

    render(<PortsProvider value={ports}><OrderTicketPanelContainer tableId="table-1" /></PortsProvider>);

    await waitFor(() => expect(within(screen.getByRole("table")).getByText("KUTANA Pilsener 500ml")).toBeInTheDocument());
    expect(within(screen.getByRole("table")).queryByRole("button", { name: "Eliminar KUTANA Pilsener" })).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "Eliminar Loaded Nachos" }));
    await waitFor(() => expect(within(screen.getByRole("table")).queryByText("Loaded Nachos")).not.toBeInTheDocument());
  });

  it("hides removal when the assigned member is the second line in an aggregated group", async () => {
    const ports = buildMockPorts();
    const order = await ports.orders.findByTable("table-1");
    if (!order) throw new Error("expected seeded order");
    const second = addLineItem(order, {
      productId: "product-pilsener-500", nameSnapshot: "KUTANA Pilsener 500ml", unitPriceCents: 350,
      quantity: 1, taxRateBp: 1200, pourSizeMl: 500,
    });
    await ports.orders.save(second, order.version);
    const secondLine = second.lineItems[second.lineItems.length - 1]!;
    const account = createPersonalAccount({ id: "account-second", orderId: second.id, freeName: "Ana" });
    await ports.personalAccounts.save(account, [createAccountLineAllocation({
      id: "allocation-second", accountId: account.id, lineItemId: secondLine.id, quantity: 1,
    })], 0);

    render(<PortsProvider value={ports}><OrderTicketPanelContainer tableId="table-1" /></PortsProvider>);

    await waitFor(() => expect(within(screen.getByRole("table")).getByText("x3")).toBeInTheDocument());
    expect(within(screen.getByRole("table")).queryByRole("button", { name: "Eliminar KUTANA Pilsener" })).not.toBeInTheDocument();
  });

  it("blocks a stale remove click after an allocation appears and reports why", async () => {
    const ports = buildMockPorts();
    render(<PortsProvider value={ports}><Toaster /><OrderTicketPanelContainer tableId="table-1" /></PortsProvider>);
    await waitFor(() => expect(within(screen.getByRole("table")).getByText("KUTANA Pilsener 500ml")).toBeInTheDocument());

    const order = await ports.orders.findByTable("table-1");
    if (!order) throw new Error("expected seeded order");
    const account = createPersonalAccount({ id: "account-stale", orderId: order.id, freeName: "Ana" });
    await ports.personalAccounts.save(account, [createAccountLineAllocation({
      id: "allocation-stale", accountId: account.id, lineItemId: order.lineItems[0]!.id, quantity: 1,
    })], 0);
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "Eliminar KUTANA Pilsener" }));

    expect(await ports.orders.findByTable("table-1")).toMatchObject({ version: order.version });
    expect(await screen.findByText("No se puede eliminar un producto asignado a una cuenta.")).toBeInTheDocument();
    expect(screen.getAllByText("No se puede eliminar un producto asignado a una cuenta.")).toHaveLength(2);
  });

  it("removes a product from the table order using the trash action", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <OrderTicketPanelContainer tableId="table-1" />
      </PortsProvider>,
    );

    await waitFor(() => expect(within(screen.getByRole("table")).getByText("Loaded Nachos")).toBeInTheDocument());
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "Eliminar Loaded Nachos" }));

    await waitFor(() => expect(within(screen.getByRole("table")).queryByText("Loaded Nachos")).not.toBeInTheDocument());
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

    await waitFor(() => expect(within(screen.getByRole("table")).getByText("Loaded Nachos")).toBeInTheDocument());
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "Eliminar Loaded Nachos" }));
    await waitFor(() => expect(within(screen.getByRole("table")).queryByText("Loaded Nachos")).not.toBeInTheDocument());
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "Eliminar KUTANA Pilsener" }));
    await waitFor(() => expect(within(screen.getByRole("table")).getByText("x1")).toBeInTheDocument());
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "Eliminar KUTANA Pilsener" }));

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

    await waitFor(() => expect(within(screen.getByRole("table")).getByText("Loaded Nachos")).toBeInTheDocument());

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

    await waitFor(() => expect(within(screen.getByRole("table")).getByText("Beef Empanadas (3pc)")).toBeInTheDocument());
  });
});
