import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createAccountLineAllocation, createPersonalAccount } from "@kutana/shared/billing/model/personal-account.js";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import { buildMockPorts } from "../../../composition/mock.js";
import { RegisterPaymentContainer } from "./RegisterPaymentContainer.js";

describe("RegisterPaymentContainer", () => {
  it("renders exactly the v1 registry methods — CASH, Bank Transfer, QR Payment — never a card option", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <RegisterPaymentContainer tableId="table-1" />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByRole("radio", { name: "Efectivo" })).toBeInTheDocument());
    expect(screen.getByRole("radio", { name: "Transferencia" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Pago QR" })).toBeInTheDocument();
    expect(screen.queryByText(/card/i)).not.toBeInTheDocument();
  });

  it("supports two partial payments (CASH then QR_PAYMENT) that together cover the full ticket total", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <RegisterPaymentContainer tableId="table-1" />
      </PortsProvider>,
    );

    // Seeded order: 2x Pilsener 500ml (784 total w/ tax) + 1 Nachos (728) = 1512
    await waitFor(() => expect(screen.getAllByText("$15.12").length).toBeGreaterThan(0));
    expect(screen.getByText("KUTANA Pilsener 500ml")).toBeInTheDocument();
    expect(screen.getByText("Loaded Nachos")).toBeInTheDocument();

    // First partial payment: CASH, pay 1000 of the 1512 total, tendered exactly 1000.
    fireEvent.click(screen.getByRole("radio", { name: "Efectivo" }));
    fireEvent.change(screen.getByLabelText("Monto a cobrar"), { target: { value: "10.00" } });
    fireEvent.change(screen.getByLabelText("Efectivo recibido"), { target: { value: "10.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar pago · $10.00" }));

    // Remaining balance drops to 512.
    await waitFor(() => expect(screen.getByText("$5.12")).toBeInTheDocument());

    // Second partial payment: QR_PAYMENT (no tendered/change UI) covers the rest.
    fireEvent.click(screen.getByRole("radio", { name: "Pago QR" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Confirmo que el pago QR fue recibido." }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Registrar pago · \$5\.12/ })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /Registrar pago · \$5\.12/ }));

    await waitFor(() => expect(screen.getAllByText("$0.00").length).toBeGreaterThan(0));

    const finalPayments = await ports.payments.listByTicket(
      (await ports.tickets.listByOrder((await ports.orders.findByTable("table-1"))!.id))[0]!.id,
    );
    expect(finalPayments).toHaveLength(2);
    expect(finalPayments.reduce((sum, payment) => sum + payment.amountCents, 0)).toBe(1512);
  });

  it("uses the same checkout screen to pay a selected personal account with method choice", async () => {
    const ports = buildMockPorts();
    const order = (await ports.orders.findByTable("table-1"))!;
    const account = createPersonalAccount({ id: "account-juan", orderId: order.id, freeName: "Juan P." });
    const allocation = createAccountLineAllocation({
      id: "account-allocation-1",
      accountId: account.id,
      lineItemId: order.lineItems[0]!.id,
      quantity: 1,
    });
    await ports.personalAccounts.save(account, [allocation], account.version);

    render(
      <PortsProvider value={ports}>
        <RegisterPaymentContainer tableId="table-1" personalAccountId={account.id} />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Cobrar orden" })).toBeInTheDocument());
    expect(screen.getByRole("radio", { name: /Efectivo/ })).toBeInTheDocument();
    expect(screen.getByText("KUTANA Pilsener 500ml")).toBeInTheDocument();
    expect(screen.queryByText("Loaded Nachos")).not.toBeInTheDocument();
    expect(screen.getAllByText("$3.92").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("radio", { name: /Pago QR/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Confirmo que el pago QR fue recibido." }));
    fireEvent.click(screen.getByRole("button", { name: /Registrar pago ·/ }));

    await waitFor(async () => {
      const payments = await ports.payments.listByTarget({ kind: "personal_account", accountId: account.id });
      expect(payments).toHaveLength(1);
      expect(payments[0]!.amountCents).toBe(392);
      expect((await ports.personalAccounts.findById(account.id))?.status).toBe("paid");
    });
  });

  it("shows every order product when paying the full table even if an open ticket has no line allocations yet", async () => {
    const ports = buildMockPorts();
    const order = (await ports.orders.findByTable("table-1"))!;
    await ports.tickets.save(
      {
        id: "empty-ticket",
        orderId: order.id,
        label: "Mesa completa",
        status: "open" as const,
        version: 1,
      },
      [],
      0,
    );

    render(
      <PortsProvider value={ports}>
        <RegisterPaymentContainer tableId="table-1" />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getAllByText("$15.12").length).toBeGreaterThan(0));
    expect(screen.getByText("KUTANA Pilsener 500ml")).toBeInTheDocument();
    expect(screen.getByText("Loaded Nachos")).toBeInTheDocument();
  });

  it("pays a SPECIFIC ticket by id, only charging the line items actually allocated to it (a split-bill scenario)", async () => {
    const ports = buildMockPorts();
    const order = (await ports.orders.findByTable("table-1"))!;

    // Simulate what the split-bill screen produces: two tickets, item split
    // between them via a real Allocation repoint (not fabricated).
    const [firstLine, secondLine] = order.lineItems;
    const originalTicket = {
      ...(await ports.tickets.save(
        {
          id: "ticket-original",
          orderId: order.id,
          label: "Original Bill",
          status: "open" as const,
          version: 1,
        },
        [
          {
            id: "alloc-1",
            lineItemId: firstLine!.id,
            ticketId: "ticket-original",
            shareBp: 10_000,
          },
        ],
        0,
      )),
    };
    const newTicket = await ports.tickets.save(
      {
        id: "ticket-new",
        orderId: order.id,
        label: "New Bill",
        status: "open" as const,
        version: 1,
      },
      [
        { id: "alloc-1", lineItemId: firstLine!.id, ticketId: "ticket-original", shareBp: 10_000 },
        { id: "alloc-2", lineItemId: secondLine!.id, ticketId: "ticket-new", shareBp: 10_000 },
      ],
      0,
    );

    render(
      <PortsProvider value={ports}>
        <RegisterPaymentContainer tableId="table-1" ticketId={newTicket.id} />
      </PortsProvider>,
    );

    // Only the second line item's total should show, not the full order total.
    await waitFor(() =>
      expect(
        screen.getAllByText(`$${(secondLine!.totalCents / 100).toFixed(2)}`).length,
      ).toBeGreaterThan(0),
    );
    expect(screen.queryByText("KUTANA Pilsener 500ml")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Pago QR" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Confirmo que el pago QR fue recibido." }));
    fireEvent.click(screen.getByRole("button", { name: /Registrar pago ·/ }));

    await waitFor(async () => {
      const payments = await ports.payments.listByTicket(newTicket.id);
      expect(payments).toHaveLength(1);
      expect(payments[0]!.amountCents).toBe(secondLine!.totalCents);
    });

    // The Original Bill's allocation must remain untouched by the New Bill's payment.
    const finalAllocations = await ports.tickets.listAllocationsByOrder(order.id);
    expect(finalAllocations.find((a) => a.lineItemId === firstLine!.id)?.ticketId).toBe(
      originalTicket.id,
    );
  });
});
