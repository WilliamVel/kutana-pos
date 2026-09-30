import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
    expect(screen.queryByText("Pendiente")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Resumen de orden para Table 1" })).not.toHaveAttribute(
      "data-overlay-scroll-owner",
    );
  });

  it("defaults to pending rows, exposes paid rows conditionally, and keeps totals unchanged", () => {
    const sections = [
      { label: "Bebidas" as const, lines: [{ ...LINES[0]!, paymentStatus: "paid" as const }] },
      { label: "Comida" as const, lines: [{ ...LINES[1]!, paymentStatus: "partial" as const }] },
    ];
    render(
      <OrderTicketPanel
        tableLabel="Table 1"
        status="active"
        lines={LINES}
        sections={sections}
        subtotalCents={1350}
        taxCents={162}
        totalCents={1512}
      />,
    );

    expect(screen.getByRole("tab", { name: "Pendientes · 1" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Pagados · 2" })).toBeInTheDocument();
    expect(screen.getByText("Total de la orden")).toBeInTheDocument();
    expect(screen.getByText("Pagado")).toBeInTheDocument();
    expect(screen.getByText("Saldo pendiente")).toBeInTheDocument();
    expect(screen.queryAllByText("KUTANA Pilsener 500ml").length).toBe(0);
    expect(screen.getAllByText("Loaded Nachos").length).toBe(2);
    expect(screen.getByText("$13.50")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Pagados/ }));
    expect(screen.getAllByText("KUTANA Pilsener 500ml").length).toBe(2);
    expect(screen.queryAllByText("Loaded Nachos").length).toBe(0);
  });

  it("keeps paid and pending tab counts based on complete visible units", () => {
    render(
      <OrderTicketPanel
        tableLabel="Table 1"
        status="active"
        lines={LINES}
        sections={[
          { label: "Bebidas" as const, lines: [{ ...LINES[0]!, quantity: 3, paymentSegment: "paid" as const }] },
          { label: "Bebidas" as const, lines: [{ ...LINES[0]!, quantity: 4, paymentSegment: "pending" as const }] },
        ]}
        subtotalCents={2450}
        taxCents={0}
        totalCents={2450}
      />,
    );

    expect(screen.getByRole("tab", { name: "Pagados · 3" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Pendientes · 4" })).toBeInTheDocument();
  });

  it("resets to pending when no paid rows remain", () => {
    const { rerender } = render(
      <OrderTicketPanel
        tableLabel="Table 1"
        status="active"
        lines={[{ ...LINES[0]!, paymentStatus: "paid" }]}
        subtotalCents={700}
        taxCents={0}
        totalCents={700}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: /Pagados/ }));
    rerender(
      <OrderTicketPanel
        tableLabel="Table 1"
        status="active"
        lines={[{ ...LINES[0]!, paymentStatus: "partial" }]}
        subtotalCents={700}
        taxCents={0}
        totalCents={700}
      />,
    );
    expect(screen.getByRole("tab", { name: /Pendientes/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.queryByRole("tab", { name: /Pagados/ })).not.toBeInTheDocument();
  });

  it("keeps selection callbacks keyed by the existing aggregate line id", () => {
    const onSelectionChange = vi.fn();
    render(
      <OrderTicketPanel
        tableLabel="Table 1"
        status="active"
        lines={[{ ...LINES[0]!, paymentStatus: "pending", pendingQuantity: 2 }]}
        subtotalCents={700}
        taxCents={0}
        totalCents={700}
        selectionMode
        onSelectionChange={onSelectionChange}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onSelectionChange).toHaveBeenCalledWith([{ lineId: "line-1", quantity: 1 }]);
  });

  it("uses the pending segment when paid and pending segments share an id", () => {
    const duplicatedId = "line-duplicated";
    render(
      <OrderTicketPanel
        tableLabel="Table 1"
        status="active"
        lines={[
          {
            ...LINES[0]!,
            id: duplicatedId,
            quantity: 2,
            totalCents: 1000,
            settlementTotalCents: 1000,
            paymentSegment: "paid",
            paymentStatus: "paid",
          },
          {
            ...LINES[0]!,
            id: duplicatedId,
            quantity: 2,
            totalCents: 700,
            settlementTotalCents: 600,
            pendingQuantity: 2,
            paymentSegment: "pending",
            paymentStatus: "partial",
          },
        ]}
        subtotalCents={1700}
        taxCents={0}
        totalCents={1700}
        selectionMode
        selectedProducts={[{ lineId: duplicatedId, quantity: 2 }]}
      />,
    );

    expect(screen.getAllByText("$6.00").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Revisar y cobrar" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Total a cobrar");
    expect(screen.getByRole("dialog")).toHaveTextContent("$6.00");
    expect(screen.getByRole("dialog")).not.toHaveTextContent("$10.00");
  });

  it("shows beverage and food section labels while selecting products", () => {
    render(
      <OrderTicketPanel
        tableLabel="Table 1"
        status="active"
        lines={LINES}
        sections={[
          { label: "Bebidas", lines: [LINES[0]!] },
          { label: "Comida", lines: [LINES[1]!] },
        ]}
        subtotalCents={1350}
        taxCents={162}
        totalCents={1512}
        selectionMode
      />,
    );

    expect(screen.getByRole("heading", { name: "Bebidas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Comida" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Resumen de orden para Table 1" })).toHaveAttribute(
      "data-overlay-scroll-owner",
      "true",
    );
  });

  it("hides the remove affordance for an assigned aggregated row", () => {
    render(
      <OrderTicketPanel
        tableLabel="Table 1"
        status="active"
        lines={[{ ...LINES[0]!, canRemove: false }]}
        subtotalCents={700}
        taxCents={0}
        totalCents={700}
        onRemoveLine={() => undefined}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Eliminar KUTANA Pilsener" }),
    ).not.toBeInTheDocument();
  });

  it("omits the tax row for a new zero-tax order while preserving its listed total", () => {
    render(
      <OrderTicketPanel
        tableLabel="Table 2"
        status="active"
        lines={[{ ...LINES[0]!, unitPriceCents: 350, totalCents: 700 }]}
        subtotalCents={700}
        taxCents={0}
        totalCents={700}
      />,
    );

    expect(screen.queryByText("Impuestos")).not.toBeInTheDocument();
    expect(screen.getAllByText("$7.00").length).toBeGreaterThanOrEqual(2);
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
        paymentDetails={[
          {
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
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ver detalle de pagos" }));
    expect(screen.getByRole("dialog", { name: "Mesa 1" })).toBeInTheDocument();
    expect(screen.getByText("KUTANA Pilsener · 500 ml × 2")).toBeInTheDocument();
    expect(screen.getByText("$7.84")).toBeInTheDocument();
    expect(screen.getByText("$3.92 pagado · $3.92 pendiente")).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("tab", { name: "Pendientes" }));
    expect(screen.getByText("KUTANA Pilsener · 500 ml × 2")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("selects whole units, shows the amount, and preserves the review before checkout", async () => {
    let selection = [] as { lineId: string; quantity: number }[];
    const onSelectionChange = (next: readonly { lineId: string; quantity: number }[]): void => {
      selection = [...next];
    };
    const onReview = (next: readonly { lineId: string; quantity: number }[]): void => {
      selection = [...next];
    };
    const { rerender } = render(
      <OrderTicketPanel
        tableLabel="Mesa 4"
        status="active"
        lines={LINES}
        subtotalCents={1350}
        taxCents={162}
        totalCents={1512}
        selectionMode
        selectedProducts={selection}
        onSelectionChange={onSelectionChange}
        onReviewSelectedProducts={onReview}
      />,
    );
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]!);
    rerender(
      <OrderTicketPanel
        tableLabel="Mesa 4"
        status="active"
        lines={LINES}
        subtotalCents={1350}
        taxCents={162}
        totalCents={1512}
        selectionMode
        selectedProducts={selection}
        onSelectionChange={onSelectionChange}
        onReviewSelectedProducts={onReview}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Revisar y cobrar" }).parentElement,
    ).toHaveTextContent("1 unidad seleccionadas");
    expect(
      screen.getByRole("button", { name: "Revisar y cobrar" }).parentElement,
    ).toHaveTextContent("$3.92");
    fireEvent.click(screen.getByRole("button", { name: "Revisar y cobrar" }));
    expect(screen.getByRole("dialog", { name: "Mesa 4" })).toBeInTheDocument();
    expect(screen.getByText("Saldo restante")).toBeInTheDocument();
    expect(screen.getByText("Después de este cobro")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar revisión del cobro" })).toBeInTheDocument();
    const payButton = screen.getByRole("button", { name: "Cobrar $3.92" });
    expect(payButton).toHaveTextContent("Cobrar");
    expect(payButton).toHaveTextContent("$3.92");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Revisar y cobrar" })).toHaveFocus(),
    );
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
