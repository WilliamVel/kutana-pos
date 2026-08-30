import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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

    await waitFor(() => expect(screen.getByRole("radio", { name: "Cash" })).toBeInTheDocument());
    expect(screen.getByRole("radio", { name: "Bank Transfer" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "QR Payment" })).toBeInTheDocument();
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

    // First partial payment: CASH, pay 1000 of the 1512 total, tendered exactly 1000.
    fireEvent.click(screen.getByRole("radio", { name: "Cash" }));
    fireEvent.change(screen.getByLabelText("Amount to pay now"), { target: { value: "10.00" } });
    fireEvent.change(screen.getByLabelText("Amount tendered"), { target: { value: "10.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm payment" }));

    // Remaining balance drops to 512.
    await waitFor(() => expect(screen.getByText("$5.12")).toBeInTheDocument());

    // Second partial payment: QR_PAYMENT (no tendered/change UI) covers the rest.
    fireEvent.click(screen.getByRole("radio", { name: "QR Payment" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm payment" }));

    await waitFor(() => expect(screen.getAllByText("$0.00").length).toBeGreaterThan(0));

    const finalPayments = await ports.payments.listByTicket(
      (await ports.tickets.listByOrder((await ports.orders.findByTable("table-1"))!.id))[0]!.id,
    );
    expect(finalPayments).toHaveLength(2);
    expect(finalPayments.reduce((sum, payment) => sum + payment.amountCents, 0)).toBe(1512);
  });
});
