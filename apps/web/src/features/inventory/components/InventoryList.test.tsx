import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InventoryList, type InventoryRow } from "./InventoryList.js";

const ROWS: InventoryRow[] = [
  {
    id: "product-pilsener-500",
    name: "KUTANA Pilsener 500ml",
    sku: "DRAFT-PILS-500",
    categoryName: "Draft Beer",
    priceCents: 350,
    imageUrl: null,
    presentation: null,
    stockStatus: "low-stock",
    stockLabel: "4500ml",
  },
  {
    id: "product-stout-bottle",
    name: "KUTANA Stout 330ml Bottle",
    sku: "BOTTLE-STOUT-330",
    categoryName: "Bottled Beer",
    priceCents: 380,
    imageUrl: null,
    presentation: null,
    stockStatus: "in-stock",
    stockLabel: "48 unidades",
  },
];

function renderList(overrides: Partial<React.ComponentProps<typeof InventoryList>> = {}) {
  const props: React.ComponentProps<typeof InventoryList> = {
    rows: ROWS,
    categories: [
      { id: "cat-draft", name: "Draft Beer" },
      { id: "cat-bottled", name: "Bottled Beer" },
    ],
    selectedCategoryId: null,
    onCategoryChange: vi.fn(),
    stockStatusFilter: null,
    onStockStatusFilterChange: vi.fn(),
    searchQuery: "",
    onSearchQueryChange: vi.fn(),
    page: 1,
    pageCount: 1,
    onPageChange: vi.fn(),
    onEditProduct: vi.fn(),
    ...overrides,
  };
  render(<InventoryList {...props} />);
  return props;
}

describe("InventoryList", () => {
  it("renders each product with its formatted price and correctly-typed stock label", () => {
    renderList();

    expect(screen.getByText("KUTANA Pilsener 500ml")).toBeInTheDocument();
    expect(screen.getByText("DRAFT-PILS-500")).toBeInTheDocument();
    expect(screen.getByText("$3.50")).toBeInTheDocument();
    // Volume stock MUST show millilitres, never a unit count for draft beer.
    expect(screen.getByText("4500ml")).toBeInTheDocument();
    expect(screen.getByText("48 unidades")).toBeInTheDocument();
  });

  it("shows the stock status pill matching each row's real status", () => {
    const { container } = { container: renderList() && document.body };
    expect(container.querySelector('[data-status="low-stock"]')).toHaveTextContent("Stock bajo");
    expect(container.querySelector('[data-status="in-stock"]')).toHaveTextContent("Con stock");
  });

  it("calls onSearchQueryChange as the user types in the search box", () => {
    const props = renderList();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "pils" } });
    expect(props.onSearchQueryChange).toHaveBeenCalledWith("pils");
  });

  it("calls onCategoryChange when a category filter is selected", () => {
    const props = renderList();
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "cat-bottled" } });
    expect(props.onCategoryChange).toHaveBeenCalledWith("cat-bottled");
  });

  it("calls onStockStatusFilterChange when a stock-status filter is selected", () => {
    const props = renderList();
    fireEvent.change(screen.getByLabelText("Estado de stock"), { target: { value: "low-stock" } });
    expect(props.onStockStatusFilterChange).toHaveBeenCalledWith("low-stock");
  });

  it("calls catalog actions from the inventory header", () => {
    const props = renderList({ onAddProduct: vi.fn(), onManageCategories: vi.fn() });

    fireEvent.click(screen.getByRole("button", { name: "Agregar producto" }));
    fireEvent.click(screen.getByRole("button", { name: "Categorías" }));

    expect(props.onAddProduct).toHaveBeenCalledOnce();
    expect(props.onManageCategories).toHaveBeenCalledOnce();
  });

  it("calls onEditProduct with the selected row id", () => {
    const props = renderList();

    const row = screen.getByRole("row", {
      name: /KUTANA Pilsener 500ml DRAFT-PILS-500 Draft Beer/,
    });
    fireEvent.click(within(row).getByRole("button", { name: "Editar producto KUTANA Pilsener 500ml" }));

    expect(props.onEditProduct).toHaveBeenCalledWith("product-pilsener-500");
  });

  it("opens the actions menu in a portal and closes it with Escape", () => {
    renderList({ onDeleteProduct: vi.fn().mockResolvedValue(undefined) });
    const trigger = screen.getByRole("button", { name: "Más acciones para KUTANA Pilsener 500ml" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menuitem", { name: "Eliminar" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("does not render the retired catalog-active label", () => {
    renderList();
    expect(screen.queryByText("Catálogo activo")).not.toBeInTheDocument();
  });

  it("renders pagination controls and calls onPageChange", () => {
    const props = renderList({ page: 2, pageCount: 5 });
    expect(screen.getByText("Página 2 de 5")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(props.onPageChange).toHaveBeenCalledWith(3);
    fireEvent.click(screen.getByRole("button", { name: "Página anterior" }));
    expect(props.onPageChange).toHaveBeenCalledWith(1);
  });

  it("hides pagination controls when there is only one page", () => {
    renderList({ page: 1, pageCount: 1 });
    expect(screen.queryByRole("button", { name: "Página anterior" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Página siguiente" })).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no rows", () => {
    renderList({ rows: [] });
    expect(screen.getByText("Todavía no hay productos")).toBeInTheDocument();
  });
});
