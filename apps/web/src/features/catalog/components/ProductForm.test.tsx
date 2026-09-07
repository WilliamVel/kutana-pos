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
  description: "",
  retailPriceCents: 0,
  costPriceCents: null,
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
    submitLabel: "Crear producto",
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
      submitLabel: "Guardar cambios",
    });

    expect(screen.getByLabelText("Nombre")).toHaveValue("KUTANA Pilsener 500ml");
    expect(screen.getByLabelText("SKU")).toHaveValue("DRAFT-PILS-500");
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
  });

  it("submits the exact edited values, with price parsed to integer cents (never a float)", () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Loaded Nachos" } });
    fireEvent.change(screen.getByLabelText("SKU"), { target: { value: "FOOD-NACHOS" } });
    fireEvent.change(screen.getByLabelText("Precio de venta (USD)"), { target: { value: "6.50" } });
    fireEvent.change(screen.getByLabelText("Cantidad inicial de stock"), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByLabelText("Alerta de stock bajo"), { target: { value: "5" } });
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
    expect(screen.queryByLabelText("Medida del vaso (ml)")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Tipo de stock"), { target: { value: "volume" } });
    expect(screen.getByLabelText("Medida del vaso (ml)")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "330ml" })).toBeInTheDocument();
  });

  it("toggles the active switch", () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit, initialValues: { ...BLANK_VALUES, active: true } });

    fireEvent.click(screen.getByLabelText("Activo"));
    fireEvent.submit(screen.getByRole("form"));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
  });

  it("renders the description field as a multiline input and round-trips its value", () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    const descriptionField = screen.getByLabelText("Descripción");
    expect(descriptionField.tagName).toBe("TEXTAREA");

    fireEvent.change(descriptionField, { target: { value: "Crisp, cold, and local." } });
    fireEvent.submit(screen.getByRole("form"));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Crisp, cold, and local." }),
    );
  });

  it("submits a cost price entered as dollars-and-cents as integer cents", () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    fireEvent.change(screen.getByLabelText("Costo (USD)"), { target: { value: "4.25" } });
    fireEvent.submit(screen.getByRole("form"));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ costPriceCents: 425 }));
  });

  it("submits an empty cost price as null, never as zero", () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit, initialValues: { ...BLANK_VALUES, costPriceCents: 500 } });

    fireEvent.change(screen.getByLabelText("Costo (USD)"), { target: { value: "" } });
    fireEvent.submit(screen.getByRole("form"));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ costPriceCents: null }));
  });

  it("pre-fills description and cost price from initialValues when editing", () => {
    renderForm({
      initialValues: {
        ...BLANK_VALUES,
        description: "House-made salsa on the side.",
        costPriceCents: 275,
      },
      submitLabel: "Guardar cambios",
    });

    expect(screen.getByLabelText("Descripción")).toHaveValue("House-made salsa on the side.");
    expect(screen.getByLabelText("Costo (USD)")).toHaveValue("2.75");
  });

  it("shows field-level validation errors passed in via props", () => {
    renderForm({ errors: { sku: "El SKU ya está en uso" } });
    expect(screen.getByText("El SKU ya está en uso")).toBeInTheDocument();
  });

  it("calls onCancel when the cancel button is pressed", () => {
    const onCancel = vi.fn();
    renderForm({ onCancel });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
