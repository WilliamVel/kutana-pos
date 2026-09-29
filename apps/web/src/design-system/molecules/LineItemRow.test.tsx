import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LineItemRow } from "./LineItemRow.js";

describe("LineItemRow", () => {
  it("renders the item name, quantity, and computed line total", () => {
    render(
      <LineItemRow
        name="KUTANA Pilsener 500ml"
        quantity={2}
        unitPriceCents={350}
        totalCents={700}
      />,
    );

    expect(screen.getByText("KUTANA Pilsener 500ml")).toBeInTheDocument();
    expect(screen.getByText("x2")).toBeInTheDocument();
    expect(screen.getByLabelText("2 unidades, solo lectura")).toBeInTheDocument();
    expect(screen.getByText("$7.00")).toBeInTheDocument();
  });

  it("renders a pour size badge when the line item is a volume pour", () => {
    render(
      <LineItemRow
        name="KUTANA Pilsener 500ml"
        quantity={1}
        unitPriceCents={350}
        totalCents={350}
        pourSizeMl={500}
      />,
    );

    expect(screen.getByText("500 ml")).toBeInTheDocument();
  });

  it("does not render a pour size badge for unit-kind items", () => {
    render(<LineItemRow name="Loaded Nachos" quantity={1} unitPriceCents={650} totalCents={650} />);

    expect(screen.queryByText(/ml$/)).not.toBeInTheDocument();
  });

  it("shows the amount represented by paid whole units for partial payments", () => {
    render(
      <LineItemRow
        name="Blonde Ale"
        quantity={2}
        unitPriceCents={1000}
        totalCents={2000}
        settlementTotalCents={784}
        statusLabel="partial"
        paidCents={400}
      />,
    );

    expect(screen.getByText(/Parcial/).textContent).toContain("$3.92 de $7.84");
  });

  it("falls back to positive allocated cents for sub-unit partial payments", () => {
    const { rerender } = render(
      <LineItemRow
        name="Blonde Ale"
        quantity={1}
        unitPriceCents={1000}
        totalCents={1120}
        statusLabel="partial"
        paidCents={560}
      />,
    );

    expect(screen.getByText(/Parcial/)).toBeInTheDocument();
    expect(screen.getByText(/Parcial/).textContent).toContain("$5.60 de $11.20");
    expect(screen.queryByText(/^Pago$/)).not.toBeInTheDocument();

    rerender(
      <LineItemRow
        name="Blonde Ale"
        quantity={1}
        unitPriceCents={1000}
        totalCents={1120}
        statusLabel="paid"
      />,
    );
    expect(screen.getByText("Pagado")).toBeInTheDocument();
  });

  it("does not repeat tax copy and labels the destructive action accessibly", () => {
    render(
      <LineItemRow
        name="Blonde Ale"
        quantity={1}
        unitPriceCents={500}
        totalCents={560}
        onRemove={() => undefined}
      />,
    );

    expect(screen.queryByText(/incluye impuestos/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar Blonde Ale" })).toBeInTheDocument();
  });

  it("marks adjustment lines distinctly from ordinary lines", () => {
    render(
      <LineItemRow
        name="Comp - manager discount"
        quantity={1}
        unitPriceCents={-200}
        totalCents={-200}
        isAdjustment
      />,
    );

    expect(screen.getByText("Ajuste")).toBeInTheDocument();
  });
});
