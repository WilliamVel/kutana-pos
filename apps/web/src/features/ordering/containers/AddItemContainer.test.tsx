import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createProduct } from "@kutana/shared/catalog/model/product.js";
import { markPaid } from "@kutana/shared/ordering/model/order.js";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import { buildMockPorts } from "../../../composition/mock.js";
import { AddItemContainer } from "./AddItemContainer.js";

describe("AddItemContainer", () => {
  it("adds the chosen product and quantity as a new line item on the table's order", async () => {
    const ports = buildMockPorts();
    await seedOrderableProduct(ports);
    render(
      <PortsProvider value={ports}>
        <AddItemContainer tableId="table-2" />
      </PortsProvider>,
    );

    await waitFor(() => expect(screen.getByText("Blonde Ale 1000ml")).toBeInTheDocument());

    const before = await ports.orders.findByTable("table-2");
    const beforeCount = before?.lineItems.length ?? 0;

    const row = screen.getByText("Blonde Ale 1000ml").closest("li");
    if (!row) throw new Error("expected a catalog row for Blonde Ale 1000ml");
    fireEvent.click(within(row).getByRole("button", { name: /^Agregar / }));

    await waitFor(async () => {
      const after = await ports.orders.findByTable("table-2");
      expect(after?.lineItems.length).toBe(beforeCount + 1);
    });

    const after = await ports.orders.findByTable("table-2");
    const added = after?.lineItems.at(-1);
    expect(added?.nameSnapshot).toBe("Blonde Ale 1000ml");
    expect(added?.unitPriceCents).toBe(800);
    expect(added?.quantity).toBe(1);
  });

  it("disables the panel when the order is already paid", async () => {
    const ports = buildMockPorts();
    await seedOrderableProduct(ports);
    const current = await ports.orders.findByTable("table-3"); // seeded as needs_check
    if (!current) throw new Error("expected a seeded order for table-3");
    await ports.orders.save(markPaid(current), current.version);

    render(
      <PortsProvider value={ports}>
        <AddItemContainer tableId="table-3" />
      </PortsProvider>,
    );

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /^Agregar / }).length).toBeGreaterThan(0),
    );
    for (const button of screen.getAllByRole("button", { name: /^Agregar / })) {
      expect(button).toBeDisabled();
    }
  });
});

async function seedOrderableProduct(ports: ReturnType<typeof buildMockPorts>): Promise<void> {
  await ports.products.save(
    createProduct({
      id: "product-blonde-1000",
      name: "Blonde Ale 1000ml",
      categoryId: "category-draft-beer",
      sku: "MENU-BLONDE-ALE-1000",
      priceCents: 800,
      taxRateBp: 1200,
      stockKind: "volume",
      pourSizeMl: 1000,
    }),
    0,
  );
}
