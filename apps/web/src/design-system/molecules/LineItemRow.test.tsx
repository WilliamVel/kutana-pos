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

    expect(screen.getByText("500ml")).toBeInTheDocument();
  });

  it("does not render a pour size badge for unit-kind items", () => {
    render(<LineItemRow name="Loaded Nachos" quantity={1} unitPriceCents={650} totalCents={650} />);

    expect(screen.queryByText(/ml$/)).not.toBeInTheDocument();
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

    expect(screen.getByText("Adjustment")).toBeInTheDocument();
  });
});
