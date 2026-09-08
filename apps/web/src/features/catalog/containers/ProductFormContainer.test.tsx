import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createProduct } from "@kutana/shared/catalog/model/product.js";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import { buildMockPorts } from "../../../composition/mock.js";
import { ProductFormContainer } from "./ProductFormContainer.js";

describe("ProductFormContainer", () => {
  it("creates a new product via ProductRepository with an integer-cents price", async () => {
    const ports = buildMockPorts();
    const onSaved = vi.fn();

    render(
      <PortsProvider value={ports}>
        <ProductFormContainer onSaved={onSaved} onCancel={vi.fn()} />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Draft Beer")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "House Lager" } });
    fireEvent.change(screen.getByLabelText("SKU"), { target: { value: "SKU-NEW-1" } });
    fireEvent.change(screen.getByLabelText("Precio de venta (USD)"), { target: { value: "4.25" } });
    fireEvent.submit(screen.getByRole("form"));

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    const savedProduct = onSaved.mock.calls[0]![0];
    expect(savedProduct.priceCents).toBe(425);
    expect(Number.isInteger(savedProduct.priceCents)).toBe(true);

    const stored = await ports.products.findBySku("SKU-NEW-1");
    expect(stored?.name).toBe("House Lager");
  });

  it("persists description and cost price through ProductRepository", async () => {
    const ports = buildMockPorts();
    const onSaved = vi.fn();

    render(
      <PortsProvider value={ports}>
        <ProductFormContainer onSaved={onSaved} onCancel={vi.fn()} />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Draft Beer")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "House Lager" } });
    fireEvent.change(screen.getByLabelText("SKU"), { target: { value: "SKU-NEW-2" } });
    fireEvent.change(screen.getByLabelText("Descripción"), {
      target: { value: "Smooth and light." },
    });
    fireEvent.change(screen.getByLabelText("Precio de venta (USD)"), { target: { value: "4.25" } });
    fireEvent.change(screen.getByLabelText("Costo (USD)"), { target: { value: "1.50" } });
    fireEvent.submit(screen.getByRole("form"));

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());

    const stored = await ports.products.findBySku("SKU-NEW-2");
    expect(stored?.description).toBe("Smooth and light.");
    expect(stored?.costPriceCents).toBe(150);
  });

  it("saves an existing product using the latest repository version", async () => {
    const ports = buildMockPorts();
    const onSaved = vi.fn();
    const original = await ports.products.save(
      createProduct({
        id: "product-editable",
        name: "Original Lager",
        categoryId: "category-draft-beer",
        sku: "EDIT-LAGER",
        priceCents: 300,
        taxRateBp: 1200,
        stockKind: "unit",
      }),
      0,
    );
    await ports.products.save({ ...original, name: "Repository Lager" }, original.version);

    render(
      <PortsProvider value={ports}>
        <ProductFormContainer existingProduct={original} onSaved={onSaved} onCancel={vi.fn()} />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Draft Beer")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Edited Lager" } });
    fireEvent.submit(screen.getByRole("form"));

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(onSaved.mock.calls[0]![0]).toMatchObject({
      name: "Edited Lager",
      version: 3,
    });
  });

  it("creates and links stock when editing quantity on an existing product without stock", async () => {
    const ports = buildMockPorts();
    const onSaved = vi.fn();
    const original = await ports.products.save(
      createProduct({
        id: "product-stockless",
        name: "Stockless Lager",
        categoryId: "category-draft-beer",
        sku: "STOCKLESS-LAGER",
        priceCents: 300,
        taxRateBp: 1200,
        stockKind: "unit",
        stockItemId: null,
      }),
      0,
    );

    render(
      <PortsProvider value={ports}>
        <ProductFormContainer existingProduct={original} onSaved={onSaved} onCancel={vi.fn()} />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Draft Beer")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Cantidad inicial de stock"), { target: { value: "42" } });
    fireEvent.submit(screen.getByRole("form"));

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    const saved = onSaved.mock.calls[0]![0];
    expect(saved.stockItemId).toEqual(expect.any(String));
    await expect(ports.stock.findById(saved.stockItemId)).resolves.toMatchObject({
      quantity: 42,
      unit: "ea",
    });
  });

  it("rejects a duplicate SKU with a field-level error, without calling onSaved", async () => {
    const ports = buildMockPorts();
    const onSaved = vi.fn();
    await ports.products.save(
      createProduct({
        id: "product-existing",
        name: "Existing Pilsener",
        categoryId: "category-draft-beer",
        sku: "DRAFT-PILS-500",
        priceCents: 500,
        taxRateBp: 1200,
        stockKind: "unit",
      }),
      0,
    );

    render(
      <PortsProvider value={ports}>
        <ProductFormContainer onSaved={onSaved} onCancel={vi.fn()} />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Draft Beer")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Duplicate" } });
    fireEvent.change(screen.getByLabelText("SKU"), { target: { value: "DRAFT-PILS-500" } });
    fireEvent.submit(screen.getByRole("form"));

    await waitFor(() => expect(screen.getByText("El SKU ya está en uso")).toBeInTheDocument());
    expect(onSaved).not.toHaveBeenCalled();
  });
});
