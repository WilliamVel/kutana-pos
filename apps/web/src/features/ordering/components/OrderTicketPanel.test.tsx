import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrderTicketPanel, type OrderTicketPanelLine } from "./OrderTicketPanel.js";

const LINES: OrderTicketPanelLine[] = [
  {
    id: "line-1",
    name: "KUTANA Pilsener 500ml",
    quantity: 2,
    unitPriceCents: 350,
    totalCents: 784,
    pourSizeMl: 500,
    isAdjustment: false,
  },
  {
    id: "line-2",
    name: "Loaded Nachos",
    quantity: 1,
    unitPriceCents: 650,
    totalCents: 728,
    pourSizeMl: null,
    isAdjustment: false,
  },
];

describe("OrderTicketPanel", () => {
  it("renders the table label, status, every line item, and the subtotal/tax/total breakdown", () => {
    render(
      <OrderTicketPanel
        tableLabel="Table 1"
        status="active"
        lines={LINES}
        subtotalCents={1350}
        taxCents={162}
        totalCents={1512}
      />,
    );

    expect(screen.getByText("Table 1")).toBeInTheDocument();
    expect(screen.getAllByText("KUTANA Pilsener 500ml").length).toBe(2);
    expect(screen.getAllByText("Loaded Nachos").length).toBe(2);
    expect(screen.getAllByText("$7.00").length).toBe(2);
    expect(screen.getAllByText("$6.50").length).toBeGreaterThanOrEqual(1);
    expect(LINES.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0)).toBe(1350);
    expect(screen.queryByText("$7.84")).not.toBeInTheDocument();
    expect(screen.getByText("$13.50")).toBeInTheDocument(); // subtotal
    expect(screen.getByText("$1.62")).toBeInTheDocument(); // tax — persisted at sale time, not recomputed
    expect(screen.getAllByText("$15.12").length).toBe(2); // total and balance
  });

  it("shows paid and remaining balances when the order has partial payments", () => {
    render(
      <OrderTicketPanel
        tableLabel="Table 1"
        status="active"
        lines={LINES}
        subtotalCents={1350}
        taxCents={162}
        totalCents={512}
        paidCents={1000}
      />,
    );

    expect(screen.getByText("Pagado")).toBeInTheDocument();
    expect(screen.getByText("$10.00")).toBeInTheDocument();
    expect(screen.getByText("Saldo pendiente")).toBeInTheDocument();
    expect(screen.getByText("$5.12")).toBeInTheDocument();
  });

  it("groups mixed payment states, exposes amounts, filters, and closes with Escape", () => {
    render(
      <OrderTicketPanel
        tableLabel="Mesa 1"
        status="active"
        lines={LINES}
        subtotalCents={1350}
        taxCents={162}
        totalCents={512}
        paidCents={1000}
        paidLineCount={1}
        pendingLineCount={1}
        paymentDetails={[{
          id: "line-1",
          name: "KUTANA Pilsener 500ml",
          quantity: 2,
          unitPriceCents: 350,
          totalCents: 784,
          paidCents: 392,
          pourSizeMl: 500,
          payerLabels: ["Ana"],
          paidQuantity: 1,
          pendingQuantity: 1,
          status: "partial",
          members: [{ id: "unit-1", payerLabels: ["Ana"], paidCents: 392, status: "paid" }],
        }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ver detalle de pagos" }));
    expect(screen.getByRole("dialog", { name: "Mesa 1" })).toBeInTheDocument();
    expect(screen.getByText("KUTANA Pilsener · 500 ml × 2")).toBeInTheDocument();
    expect(screen.getByText("$7.84")).toBeInTheDocument();
    expect(screen.getByText("$3.92 pagado · $3.92 pendiente")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Pendientes" }));
    expect(screen.getByText("KUTANA Pilsener · 500 ml × 2")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows an empty state when the order has no line items yet", () => {
    render(
      <OrderTicketPanel
        tableLabel="Table 3"
        status="active"
        lines={[]}
        subtotalCents={0}
        taxCents={0}
        totalCents={0}
      />,
    );

    expect(screen.getByText("Todavía no hay productos en esta orden.")).toBeInTheDocument();
  });
});
