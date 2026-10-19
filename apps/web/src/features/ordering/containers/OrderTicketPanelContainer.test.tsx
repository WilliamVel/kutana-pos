import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Toaster, toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAccountLineAllocation, createPersonalAccount } from "@kutana/shared/billing/model/personal-account.js";
import { addLineItem } from "@kutana/shared/ordering/services/line-item-service.js";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import { buildMockPorts } from "../../../composition/mock.js";
import {
  aggregateLines,
  allocatePaidCentsToAllocations,
  OrderTicketPanelContainer,
} from "./OrderTicketPanelContainer.js";

describe("OrderTicketPanelContainer", () => {
  it("splits complete paid units into paid and pending presentation segments", async () => {
    const ports = buildMockPorts();
    const order = (await ports.orders.findByTable("table-1"))!;
    const source = { ...order.lineItems[0]!, quantity: 7, totalCents: 2100, unitPriceCents: 350 };
    const segments = aggregateLines([source], new Map([[source.id, 900]]), []);

    expect(segments).toHaveLength(2);
    expect(segments.map(({ id, quantity, paymentStatus, paymentSegment, totalCents, settlementTotalCents }) => ({
      id,
      quantity,
      paymentStatus,
      paymentSegment,
      totalCents,
      settlementTotalCents,
    }))).toEqual([
      { id: source.id, quantity: 3, paymentStatus: "paid", paymentSegment: "paid", totalCents: 1050, settlementTotalCents: 900 },
      { id: source.id, quantity: 4, paymentStatus: "partial", paymentSegment: "pending", totalCents: 1400, settlementTotalCents: 1200 },
    ]);
  });

  it("leaves all units pending when payment is below one complete unit", async () => {
    const ports = buildMockPorts();
    const order = (await ports.orders.findByTable("table-1"))!;
    const source = { ...order.lineItems[0]!, quantity: 7, totalCents: 2100, unitPriceCents: 350 };
    const segments = aggregateLines([source], new Map([[source.id, 299]]), []);

    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({
      id: source.id,
      quantity: 7,
      paymentSegment: "pending",
      totalCents: 2450,
      displayTotalCents: 1801,
      settlementTotalCents: 2100,
    });
    expect(segments[0]).not.toHaveProperty("paymentStatus");
    expect(segments[0]).toHaveProperty("displayTotalCents", 1801);
  });

  it("shows the remaining balance without changing pending quantity", async () => {
    const ports = buildMockPorts();
    const order = (await ports.orders.findByTable("table-1"))!;
    const source = { ...order.lineItems[0]!, quantity: 2, totalCents: 150, unitPriceCents: 100 };
    const segments = aggregateLines([source], new Map([[source.id, 50]]), []);

    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({
      quantity: 2,
      totalCents: 200,
      displayTotalCents: 100,
      settlementTotalCents: 150,
      paymentSegment: "pending",
    });
  });

  it("applies historical payment to earlier account allocations before newer lines", () => {
    const allocations = [
      createAccountLineAllocation({ id: "allocation-old", accountId: "account-1", lineItemId: "line-old", quantity: 1 }),
      createAccountLineAllocation({ id: "allocation-new", accountId: "account-1", lineItemId: "line-new", quantity: 1 }),
    ];
    const paidByLine = allocatePaidCentsToAllocations(
      allocations,
      new Map([["line-old", 100], ["line-new", 100]]),
      150,
    );

    expect(paidByLine).toEqual(new Map([["line-old", 100], ["line-new", 50]]));
  });

  it("does not show zero for a pending unit when the derived display balance is exhausted", async () => {
    const ports = buildMockPorts();
    const order = (await ports.orders.findByTable("table-1"))!;
    const first = { ...order.lineItems[0]!, quantity: 1, totalCents: 300, unitPriceCents: 300 };
    const second = { ...first, id: `${first.id}-second` };
    const segments = aggregateLines([first, second], new Map([[first.id, 600]]), []);

    const pending = segments.find((segment) => segment.paymentSegment === "pending");
    expect(pending).toMatchObject({
      quantity: 1,
      totalCents: 300,
      settlementTotalCents: 300,
      paymentSegment: "pending",
    });
    expect(pending).not.toHaveProperty("displayTotalCents");
  });

  afterEach(() => {
    act(() => toast.dismiss());
    vi.restoreAllMocks();
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
    const successToast = vi.spyOn(toast, "success");
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
    const removalToast = await screen.findByText("KUTANA Pilsener 500ml eliminado");
    expect(removalToast.closest("[data-sonner-toast]")).toBeInTheDocument();
    expect(successToast).toHaveBeenCalledWith("KUTANA Pilsener 500ml eliminado", {
      id: "order-ticket-removal-success",
      duration: 1500,
    });
    expect(document.querySelector('section[aria-label^="Resumen de orden"] p[role="status"]')).not.toBeInTheDocument();
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

  it("removes an unassigned unit from a partially assigned aggregate and preserves allocations", async () => {
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
    expect(within(screen.getByRole("table")).getByRole("button", { name: "Eliminar KUTANA Pilsener" })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "Eliminar KUTANA Pilsener" }));

    await waitFor(async () => {
      const updated = await ports.orders.findByTable("table-1");
      expect(updated?.lineItems[0]).toMatchObject({ quantity: 1 });
    });
    expect(await ports.personalAccounts.listAllocationsByOrder(order.id)).toEqual([
      expect.objectContaining({ lineItemId: order.lineItems[0]!.id, quantity: 1 }),
    ]);
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
    await ports.personalAccounts.save(account, [
      createAccountLineAllocation({
        id: "allocation-first", accountId: account.id, lineItemId: order.lineItems[0]!.id, quantity: 2,
      }),
      createAccountLineAllocation({
        id: "allocation-second", accountId: account.id, lineItemId: secondLine.id, quantity: 1,
      }),
    ], 0);

    render(<PortsProvider value={ports}><OrderTicketPanelContainer tableId="table-1" /></PortsProvider>);

    await waitFor(() => expect(within(screen.getByRole("table")).getByText("x3")).toBeInTheDocument());
    expect(within(screen.getByRole("table")).queryByRole("button", { name: "Eliminar KUTANA Pilsener" })).not.toBeInTheDocument();
  });

  it("blocks removal when every unit in an aggregate is assigned", async () => {
    const ports = buildMockPorts();
    render(<PortsProvider value={ports}><Toaster /><OrderTicketPanelContainer tableId="table-1" /></PortsProvider>);
    await waitFor(() => expect(within(screen.getByRole("table")).getByText("KUTANA Pilsener 500ml")).toBeInTheDocument());

    const order = await ports.orders.findByTable("table-1");
    if (!order) throw new Error("expected seeded order");
    const account = createPersonalAccount({ id: "account-stale", orderId: order.id, freeName: "Ana" });
    await ports.personalAccounts.save(account, [createAccountLineAllocation({
      id: "allocation-stale", accountId: account.id, lineItemId: order.lineItems[0]!.id, quantity: 2,
    })], 0);
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "Eliminar KUTANA Pilsener" }));

    expect(await ports.orders.findByTable("table-1")).toMatchObject({ version: order.version });
    expect(await screen.findByText("No se puede eliminar un producto asignado a una cuenta.")).toBeInTheDocument();
    expect(screen.getAllByText("No se puede eliminar un producto asignado a una cuenta.")).toHaveLength(1);
    expect(document.querySelector("[data-sonner-toast]")).not.toBeInTheDocument();
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

  it("coalesces rapid live updates and renders the latest snapshot", async () => {
    const ports = buildMockPorts();
    render(<PortsProvider value={ports}><OrderTicketPanelContainer tableId="table-1" /></PortsProvider>);
    await waitFor(() => expect(within(screen.getByRole("table")).getByText("Loaded Nachos")).toBeInTheDocument());

    const currentOrder = await ports.orders.findByTable("table-1");
    if (!currentOrder) throw new Error("expected seeded order");
    const firstUpdate = addLineItem(currentOrder, {
      productId: "product-empanadas", nameSnapshot: "Beef Empanadas (3pc)", unitPriceCents: 550,
      quantity: 1, taxRateBp: 1200,
    });
    const latestUpdate = addLineItem(firstUpdate, {
      productId: "product-empanadas", nameSnapshot: "Beef Empanadas (3pc)", unitPriceCents: 550,
      quantity: 1, taxRateBp: 1200,
    });

    ports.events.publish({ type: "order.updated", orderId: firstUpdate.id, tableId: "table-1", version: firstUpdate.version, at: new Date().toISOString(), payload: firstUpdate });
    ports.events.publish({ type: "order.updated", orderId: latestUpdate.id, tableId: "table-1", version: latestUpdate.version, at: new Date().toISOString(), payload: latestUpdate });
    expect(screen.queryByText("Beef Empanadas (3pc)")).not.toBeInTheDocument();

    await new Promise((resolve) => setTimeout(resolve, 450));
    await waitFor(() => expect(within(screen.getByRole("table")).getByText("Beef Empanadas (3pc)")).toBeInTheDocument());
    expect(within(screen.getByRole("table")).getAllByText("x2")).toHaveLength(2);
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
