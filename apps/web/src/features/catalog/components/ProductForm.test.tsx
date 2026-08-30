import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductForm, type ProductFormValues } from "./ProductForm.js";

const CATEGORIES = [
  { id: "cat-draft", name: "Draft Beer" },
  { id: "cat-food", name: "Food" },
];

const BLANK_VALUES: ProductFormValues = {
  name: "",
  categoryId: "cat-draft",
  sku: "",
  barcode: "",
  stockKind: "unit",
  pourSizeMl: null,
  retailPriceCents: 0,
  lowStockLevel: null,
  initialStockQuantity: 0,
  active: true,
};

function renderForm(overrides: Partial<React.ComponentProps<typeof ProductForm>> = {}) {
  const props: React.ComponentProps<typeof ProductForm> = {
    categories: CATEGORIES,
    initialValues: BLANK_VALUES,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    submitLabel: "Create product",
    errors: {},
    ...overrides,
  };
  render(<ProductForm {...props} />);
  return props;
}

describe("ProductForm", () => {
  it("renders every required field pre-filled from initialValues when editing", () => {
    renderForm({
      initialValues: { ...BLANK_VALUES, name: "KUTANA Pilsener 500ml", sku: "DRAFT-PILS-500" },
      submitLabel: "Save changes",
    });

    expect(screen.getByLabelText("Name")).toHaveValue("KUTANA Pilsener 500ml");
    expect(screen.getByLabelText("SKU")).toHaveValue("DRAFT-PILS-500");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("submits the exact edited values, with price parsed to integer cents (never a float)", () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Loaded Nachos" } });
    fireEvent.change(screen.getByLabelText("SKU"), { target: { value: "FOOD-NACHOS" } });
    fireEvent.change(screen.getByLabelText("Retail price (USD)"), { target: { value: "6.50" } });
    fireEvent.change(screen.getByLabelText("Initial stock quantity"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Low-stock alert level"), { target: { value: "5" } });
    fireEvent.submit(screen.getByRole("form"));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Loaded Nachos",
        sku: "FOOD-NACHOS",
        retailPriceCents: 650,
        initialStockQuantity: 20,
        lowStockLevel: 5,
      }),
    );
  });

  it("reveals the pour-size field only when stock kind is volume (draft beer)", () => {
    renderForm();
    expect(screen.queryByLabelText("Pour size (ml)")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Stock kind"), { target: { value: "volume" } });
    expect(screen.getByLabelText("Pour size (ml)")).toBeInTheDocument();
  });

  it("toggles the active switch", () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit, initialValues: { ...BLANK_VALUES, active: true } });

    fireEvent.click(screen.getByLabelText("Active"));
    fireEvent.submit(screen.getByRole("form"));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
  });

  it("shows field-level validation errors passed in via props", () => {
    renderForm({ errors: { sku: "SKU already in use" } });
    expect(screen.getByText("SKU already in use")).toBeInTheDocument();
  });

  it("calls onCancel when the cancel button is pressed", () => {
    const onCancel = vi.fn();
    renderForm({ onCancel });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
