import { fireEvent, render, screen } from "@testing-library/react";
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
    stockStatus: "in-stock",
    stockLabel: "48 units",
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
    expect(screen.getByText("48 units")).toBeInTheDocument();
  });

  it("shows the stock status pill matching each row's real status", () => {
    const { container } = { container: renderList() && document.body };
    expect(container.querySelector('[data-status="low-stock"]')).toHaveTextContent("Low stock");
    expect(container.querySelector('[data-status="in-stock"]')).toHaveTextContent("In stock");
  });

  it("calls onSearchQueryChange as the user types in the search box", () => {
    const props = renderList();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "pils" } });
    expect(props.onSearchQueryChange).toHaveBeenCalledWith("pils");
  });

  it("calls onCategoryChange when a category filter is selected", () => {
    const props = renderList();
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "cat-bottled" } });
    expect(props.onCategoryChange).toHaveBeenCalledWith("cat-bottled");
  });

  it("calls onStockStatusFilterChange when a stock-status filter is selected", () => {
    const props = renderList();
    fireEvent.change(screen.getByLabelText("Stock status"), { target: { value: "low-stock" } });
    expect(props.onStockStatusFilterChange).toHaveBeenCalledWith("low-stock");
  });

  it("renders pagination controls and calls onPageChange", () => {
    const props = renderList({ page: 2, pageCount: 5 });
    expect(screen.getByText("Page 2 of 5")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(props.onPageChange).toHaveBeenCalledWith(3);
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(props.onPageChange).toHaveBeenCalledWith(1);
  });

  it("disables Previous on the first page and Next on the last page", () => {
    renderList({ page: 1, pageCount: 1 });
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("shows an empty state when there are no rows", () => {
    renderList({ rows: [] });
    expect(screen.getByText("No products match your filters.")).toBeInTheDocument();
  });
});
