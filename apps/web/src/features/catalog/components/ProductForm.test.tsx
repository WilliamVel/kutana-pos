import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductForm, type ProductFormValues } from "./ProductForm.js";

const CATEGORIES = [{ id: "cat-draft", name: "Draft Beer" }, { id: "cat-food", name: "Food" }];
const BLANK_VALUES: ProductFormValues = {
  name: "", categoryId: "cat-draft", sku: "", barcode: "", stockKind: "unit", pourSizeMl: null,
  description: "", retailPriceCents: 0, costPriceCents: null, lowStockLevel: null,
  initialStockQuantity: 0, active: true,
};
function renderForm(overrides: Partial<React.ComponentProps<typeof ProductForm>> = {}) {
  const props: React.ComponentProps<typeof ProductForm> = { categories: CATEGORIES, initialValues: BLANK_VALUES, onSubmit: vi.fn(), onCancel: vi.fn(), submitLabel: "Crear producto", errors: {}, ...overrides };
  render(<ProductForm {...props} />);
  return props;
}
function completeRequiredFields() {
  fireEvent.change(screen.getByLabelText("Nombre del producto *"), { target: { value: "Loaded Nachos" } });
  fireEvent.change(screen.getByLabelText("Precio de venta * (USD)"), { target: { value: "6.50" } });
}

describe("ProductForm", () => {
  it("renders the compact basic form and a live summary", () => {
    renderForm({ initialValues: { ...BLANK_VALUES, name: "KUTANA Pilsener", retailPriceCents: 550 } });
    expect(screen.getByRole("heading", { name: "Información básica" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Resumen del producto" })).toHaveTextContent("5.50 USD");
    expect(screen.getByText("Estado")).toBeInTheDocument();
  });

  it("keeps Más opciones closed until the summary row is opened", () => {
    renderForm();
    const details = screen.getByText("Más opciones").closest("details");
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("Más opciones"));
    expect(details).toHaveAttribute("open");
    fireEvent.click(screen.getByText("Más opciones"));
    expect(details).not.toHaveAttribute("open");
  });

  it("conditionally reveals inventory controls and submits integer cents", () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });
    expect(screen.queryByLabelText(/Stock inicial/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Controlar inventario para este producto"));
    fireEvent.change(screen.getByLabelText("Stock inicial (unidades)"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Alerta de stock bajo (unidades)"), { target: { value: "5" } });
    completeRequiredFields();
    fireEvent.submit(screen.getByRole("form"));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ retailPriceCents: 650, initialStockQuantity: 20, lowStockLevel: 5, trackInventory: true }));
  });

  it("moves the active state into the summary and preserves it on submit", () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });
    fireEvent.click(screen.getByRole("checkbox", { name: "Producto activo" }));
    completeRequiredFields();
    fireEvent.submit(screen.getByRole("form"));
    expect(screen.getByText("Borrador")).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
  });

  it("shows validation summary and focuses it when required fields are missing", () => {
    renderForm();
    fireEvent.submit(screen.getByRole("form"));
    const summary = screen.getByText("Revisá los datos del producto.").closest("[role=alert]");
    expect(summary).toHaveFocus();
    expect(summary).toHaveTextContent("nombre");
  });

  it("keeps cancel secondary and confirms when the form is dirty", () => {
    const onCancel = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderForm({ onCancel });
    completeRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("round-trips optional details and reports duplicate errors", () => {
    renderForm({ errors: { sku: "El SKU ya está en uso" } });
    expect(screen.getByText("El SKU ya está en uso")).toBeInTheDocument();
    expect(screen.getByLabelText("SKU")).toBeInTheDocument();
  });
});
