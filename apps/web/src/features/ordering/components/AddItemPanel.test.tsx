import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddItemPanel, type AddItemPanelProduct } from "./AddItemPanel.js";

const PRODUCTS: AddItemPanelProduct[] = [
  {
    id: "product-pilsener-500",
    name: "KUTANA Pilsener 500ml",
    priceCents: 350,
    categoryName: "Draft Beer",
  },
  { id: "product-nachos", name: "Loaded Nachos", priceCents: 650, categoryName: "Food" },
];

describe("AddItemPanel", () => {
  it("renders products grouped under their category headings", () => {
    render(<AddItemPanel products={PRODUCTS} onAdd={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Draft Beer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Food" })).toBeInTheDocument();
    expect(screen.getByText("KUTANA Pilsener 500ml")).toBeInTheDocument();
    expect(screen.getByText("$3.50")).toBeInTheDocument();
  });

  it("calls onAdd with the product id and the chosen quantity", () => {
    const onAdd = vi.fn();
    render(<AddItemPanel products={PRODUCTS} onAdd={onAdd} />);

    fireEvent.click(screen.getByLabelText("Increase quantity of Loaded Nachos"));
    fireEvent.click(screen.getByLabelText("Increase quantity of Loaded Nachos"));

    const row = screen.getByText("Loaded Nachos").closest("li");
    if (!row) throw new Error("expected a row for Loaded Nachos");
    fireEvent.click(within(row).getByRole("button", { name: "Add" }));

    expect(onAdd).toHaveBeenCalledWith("product-nachos", 3);
  });

  it("disables the Add buttons when disabled", () => {
    render(<AddItemPanel products={PRODUCTS} onAdd={vi.fn()} disabled />);

    for (const button of screen.getAllByRole("button", { name: "Add" })) {
      expect(button).toBeDisabled();
    }
  });
});
