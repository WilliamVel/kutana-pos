import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddItemPanel, type AddItemPanelProduct } from "./AddItemPanel.js";

const PRODUCTS: AddItemPanelProduct[] = [
  {
    id: "product-pilsener-500",
    name: "KUTANA Pilsener 500ml",
    priceCents: 350,
    categoryName: "Draft Beer",
    taxRateBp: 1200,
    pourSizeMl: 500,
  },
  {
    id: "product-nachos",
    name: "Loaded Nachos",
    priceCents: 650,
    categoryName: "Food",
    taxRateBp: 1200,
  },
];

describe("AddItemPanel", () => {
  it("renders a category tab strip and a tile per product", () => {
    render(<AddItemPanel products={PRODUCTS} onAdd={vi.fn()} />);

    expect(screen.getByRole("tab", { name: "Todos" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Draft Beer" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Food" })).toBeInTheDocument();
    expect(screen.getByText("KUTANA Pilsener 500ml")).toBeInTheDocument();
    expect(screen.getByText("$3.50")).toBeInTheDocument();
  });

  it("renders a placeholder tile (no <img>) when a product has no imageUrl", () => {
    render(<AddItemPanel products={PRODUCTS} onAdd={vi.fn()} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("calls onAdd with the product id and a quantity of one", () => {
    const onAdd = vi.fn();
    render(<AddItemPanel products={PRODUCTS} onAdd={onAdd} />);

    fireEvent.click(screen.getByRole("button", { name: "Agregar Loaded Nachos" }));

    expect(onAdd).toHaveBeenCalledWith("product-nachos", 1);
  });

  it("filters the grid to the selected category tab", () => {
    render(<AddItemPanel products={PRODUCTS} onAdd={vi.fn()} />);

    fireEvent.click(screen.getByRole("tab", { name: "Food" }));

    expect(screen.queryByText("KUTANA Pilsener 500ml")).not.toBeInTheDocument();
    expect(screen.getByText("Loaded Nachos")).toBeInTheDocument();
  });

  it("narrows the visible product tiles as the search input is typed", () => {
    render(<AddItemPanel products={PRODUCTS} onAdd={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Buscar productos"), {
      target: { value: "nach" },
    });

    expect(screen.queryByText("KUTANA Pilsener 500ml")).not.toBeInTheDocument();
    expect(screen.getByText("Loaded Nachos")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Buscar productos"), {
      target: { value: "zzz" },
    });
    expect(screen.getByText("No hay productos que coincidan.")).toBeInTheDocument();
  });

  it("disables the add buttons when disabled", () => {
    render(<AddItemPanel products={PRODUCTS} onAdd={vi.fn()} disabled />);

    const addButtons = screen
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-label")?.startsWith("Agregar "));
    expect(addButtons).toHaveLength(PRODUCTS.length);
    for (const button of addButtons) {
      expect(button).toBeDisabled();
    }
  });
});
