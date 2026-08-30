import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "House Lager" } });
    fireEvent.change(screen.getByLabelText("SKU"), { target: { value: "SKU-NEW-1" } });
    fireEvent.change(screen.getByLabelText("Retail price (USD)"), { target: { value: "4.25" } });
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

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "House Lager" } });
    fireEvent.change(screen.getByLabelText("SKU"), { target: { value: "SKU-NEW-2" } });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Smooth and light." },
    });
    fireEvent.change(screen.getByLabelText("Retail price (USD)"), { target: { value: "4.25" } });
    fireEvent.change(screen.getByLabelText("Cost price (USD)"), { target: { value: "1.50" } });
    fireEvent.submit(screen.getByRole("form"));

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());

    const stored = await ports.products.findBySku("SKU-NEW-2");
    expect(stored?.description).toBe("Smooth and light.");
    expect(stored?.costPriceCents).toBe(150);
  });

  it("rejects a duplicate SKU with a field-level error, without calling onSaved", async () => {
    const ports = buildMockPorts();
    const onSaved = vi.fn();

    render(
      <PortsProvider value={ports}>
        <ProductFormContainer onSaved={onSaved} onCancel={vi.fn()} />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Draft Beer")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Duplicate" } });
    fireEvent.change(screen.getByLabelText("SKU"), { target: { value: "DRAFT-PILS-500" } });
    fireEvent.submit(screen.getByRole("form"));

    await waitFor(() => expect(screen.getByText("SKU already in use")).toBeInTheDocument());
    expect(onSaved).not.toHaveBeenCalled();
  });
});
