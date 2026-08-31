import { render, screen } from "@testing-library/react";
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
    expect(screen.getByText("KUTANA Pilsener 500ml")).toBeInTheDocument();
    expect(screen.getByText("Loaded Nachos")).toBeInTheDocument();
    expect(screen.getByText("$13.50")).toBeInTheDocument(); // subtotal
    expect(screen.getByText("$1.62")).toBeInTheDocument(); // tax — persisted at sale time, not recomputed
    expect(screen.getByText("$15.12")).toBeInTheDocument(); // total
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

    expect(screen.getByText("No items on this order yet.")).toBeInTheDocument();
  });
});
