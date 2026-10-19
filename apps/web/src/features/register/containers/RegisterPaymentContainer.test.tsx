import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  createAccountLineAllocation,
  createPersonalAccount,
} from "@kutana/shared/billing/model/personal-account.js";
import type { PaymentMethodCode } from "@kutana/shared/payments/model/payment-method-registry.js";
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

    await waitFor(() => expect(screen.getByRole("radio", { name: "Efectivo" })).toBeChecked());
    expect(screen.getByRole("radio", { name: "Transferencia" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Pago QR" })).toBeInTheDocument();
    expect(screen.queryByText(/card/i)).not.toBeInTheDocument();
  });

  it("charges the full remaining balance and keeps cash as the only entered amount", async () => {
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
    expect(screen.getByText("Saldo pendiente")).toBeInTheDocument();
    expect(screen.getAllByText("$15.12").length).toBeGreaterThan(0);
    expect(screen.queryByText("Monto a cobrar")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Monto a cobrar")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Efectivo recibido"), { target: { value: "15.12" } });
    fireEvent.click(screen.getByRole("button", { name: "Cobrar · $15.12" }));

    await waitFor(() => expect(screen.getAllByText("$0.00").length).toBeGreaterThan(0));

    const finalPayments = await ports.payments.listByTicket(
      (await ports.tickets.listByOrder((await ports.orders.findByTable("table-1"))!.id))[0]!.id,
    );
    expect(finalPayments).toHaveLength(1);
    expect(finalPayments[0]!.amountCents).toBe(1512);
  });

  it("keeps already-paid product accounts out of the remaining whole-order balance", async () => {
    const ports = buildMockPorts();
    const order = (await ports.orders.findByTable("table-1"))!;
    const account = createPersonalAccount({
      id: "account-paid-product",
      orderId: order.id,
      freeName: "Producto pagado",
    });
    const allocation = createAccountLineAllocation({
      id: "account-paid-product-allocation",
      accountId: account.id,
      lineItemId: order.lineItems[0]!.id,
      quantity: 1,
    });
    await ports.personalAccounts.save(
      { ...account, status: "paid", closedAt: "2025-01-01T00:10:00.000Z" },
      [allocation],
      account.version,
    );
    await ports.payments.record({
      id: "payment-paid-product",
      target: { kind: "personal_account", accountId: account.id },
      methodCode: "QR_PAYMENT" as PaymentMethodCode,
      amountCents: 392,
      tenderedCents: null,
      changeCents: null,
      recordedAt: "2025-01-01T00:10:00.000Z",
    });

    const onPaymentComplete = vi.fn();
    render(
      <PortsProvider value={ports}>
        <RegisterPaymentContainer tableId="table-1" onPaymentComplete={onPaymentComplete} />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getAllByText("$11.20").length).toBeGreaterThan(0));
    expect(screen.getByRole("button", { name: "Cobrar · $11.20" })).toBeInTheDocument();
    expect(screen.getByText("Saldo pendiente")).toBeInTheDocument();
    expect(screen.queryByText("$7.28")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Pago QR" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Confirmo que el pago QR fue recibido." }));
    fireEvent.click(screen.getByRole("button", { name: /pago · \$11\.20/i }));

    await waitFor(() => expect(onPaymentComplete).toHaveBeenCalledOnce());
    await waitFor(async () => {
      const payments = await ports.payments.listByTarget({
        kind: "personal_account",
        accountId: account.id,
      });
      expect(payments).toHaveLength(1);
      expect(payments[0]!.amountCents).toBe(392);
    });
  });

  it("uses the same checkout screen to pay a selected personal account with method choice", async () => {
    const ports = buildMockPorts();
    const order = (await ports.orders.findByTable("table-1"))!;
    const account = createPersonalAccount({
      id: "account-juan",
      orderId: order.id,
      freeName: "Juan P.",
    });
    const allocation = createAccountLineAllocation({
      id: "account-allocation-1",
      accountId: account.id,
      lineItemId: order.lineItems[0]!.id,
      quantity: 1,
    });
    await ports.personalAccounts.save(account, [allocation], account.version);

    const onPaymentComplete = vi.fn();
    const onPaymentRecorded = vi.fn();
    const closeOrder = vi.spyOn(ports.paymentClosure, "closeOrder");
    render(
      <PortsProvider value={ports}>
        <RegisterPaymentContainer
          tableId="table-1"
          personalAccountId={account.id}
          onPaymentComplete={onPaymentComplete}
          onPaymentRecorded={onPaymentRecorded}
        />
      </PortsProvider>,
    );

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Cobrar orden" })).toBeInTheDocument(),
    );
    expect(screen.getByRole("radio", { name: /Efectivo/ })).toBeInTheDocument();
    expect(screen.getByText("KUTANA Pilsener 500ml")).toBeInTheDocument();
    expect(screen.queryByText("Loaded Nachos")).not.toBeInTheDocument();
    expect(screen.getAllByText("$3.92").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("radio", { name: /Pago QR/ }));
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Confirmo que el pago QR fue recibido." }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Registrar pago ·/ }));

    await waitFor(async () => {
      const payments = await ports.payments.listByTarget({
        kind: "personal_account",
        accountId: account.id,
      });
      expect(payments).toHaveLength(1);
      expect(payments[0]!.amountCents).toBe(392);
      expect((await ports.personalAccounts.findById(account.id))?.status).toBe("paid");
    });
    await waitFor(() => expect(onPaymentRecorded).toHaveBeenCalledOnce());
    expect(onPaymentComplete).not.toHaveBeenCalled();
    expect(closeOrder).not.toHaveBeenCalled();
    expect((await ports.orders.findByTable("table-1"))?.status).toBe("active");
  });

  it("returns to the active order after paying one account while another remains pending", async () => {
    const ports = buildMockPorts();
    const order = (await ports.orders.findByTable("table-1"))!;
    const firstAccount = createPersonalAccount({ id: "account-first", orderId: order.id, freeName: "First" });
    const secondAccount = createPersonalAccount({ id: "account-second", orderId: order.id, freeName: "Second" });
    await ports.personalAccounts.save(
      firstAccount,
      [createAccountLineAllocation({ accountId: firstAccount.id, lineItemId: order.lineItems[0]!.id, quantity: 1 })],
      firstAccount.version,
    );
    await ports.personalAccounts.save(
      secondAccount,
      [
        createAccountLineAllocation({ accountId: secondAccount.id, lineItemId: order.lineItems[0]!.id, quantity: 1 }),
        createAccountLineAllocation({ accountId: secondAccount.id, lineItemId: order.lineItems[1]!.id, quantity: 1 }),
      ],
      secondAccount.version,
    );
    const onPaymentRecorded = vi.fn();
    const closeOrder = vi.spyOn(ports.paymentClosure, "closeOrder");

    render(
      <PortsProvider value={ports}>
        <RegisterPaymentContainer
          tableId="table-1"
          personalAccountId={firstAccount.id}
          onPaymentRecorded={onPaymentRecorded}
        />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Cobrar orden" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("radio", { name: /Pago QR/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Confirmo que el pago QR fue recibido." }));
    fireEvent.click(screen.getByRole("button", { name: /Registrar pago ·/ }));

    await waitFor(() => expect(onPaymentRecorded).toHaveBeenCalledOnce());
    expect(closeOrder).not.toHaveBeenCalled();
    expect((await ports.orders.findByTable("table-1"))?.status).toBe("active");
  });

  it("settles only the selected whole units after payment confirmation", async () => {
    const ports = buildMockPorts();
    const order = (await ports.orders.findByTable("table-1"))!;
    const line = order.lineItems[0]!;
    render(
      <PortsProvider value={ports}>
        <RegisterPaymentContainer
          tableId="table-1"
          selectedProductLines={[{ lineId: line.id, quantity: 1 }]}
        />
      </PortsProvider>,
    );
    await waitFor(() => expect(screen.getByText("KUTANA Pilsener 500ml")).toBeInTheDocument());
    expect(screen.getAllByText("$3.92").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("radio", { name: "Pago QR" }));
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Confirmo que el pago QR fue recibido." }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Registrar pago ·/ }));
    await waitFor(async () => {
      const accounts = await ports.personalAccounts.listByOrder(order.id);
      expect(accounts).toHaveLength(1);
      const allocations = await ports.personalAccounts.listAllocationsByOrder(order.id);
      expect(allocations).toHaveLength(1);
      expect(allocations[0]!.lineItemId).toBe(line.id);
      expect(allocations[0]!.quantity).toBe(1);
      const payments = await ports.payments.listByTarget({
        kind: "personal_account",
        accountId: accounts[0]!.id,
      });
      expect(payments[0]!.amountCents).toBe(392);
      expect((await ports.orders.findByTable("table-1"))?.status).toBe("active");
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
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Confirmo que el pago QR fue recibido." }),
    );
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
