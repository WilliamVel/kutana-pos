import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Toaster, toast } from "sonner";
import { afterEach, describe, expect, it } from "vitest";
import { createProduct } from "@kutana/shared/catalog/model/product.js";
import { markPaid } from "@kutana/shared/ordering/model/order.js";
import { removeLineItem } from "@kutana/shared/ordering/services/line-item-service.js";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import { buildMockPorts } from "../../../composition/mock.js";
import { AddItemContainer } from "./AddItemContainer.js";

describe("AddItemContainer", () => {
  afterEach(() => {
    act(() => toast.dismiss());
  });
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

  it("undoes every receipt in a rapid-add batch and ignores a double tap", async () => {
    const ports = buildMockPorts();
    await seedOrderableProduct(ports);
    const counts: number[] = [];
    const onUpdated = (event: Event) => {
      counts.push((event as CustomEvent<{ orderCount: number }>).detail.orderCount);
    };
    window.addEventListener("kutana.order.updated", onUpdated);
    try {
      render(
        <PortsProvider value={ports}>
          <Toaster />
          <AddItemContainer tableId="table-2" />
        </PortsProvider>,
      );
      const add = await screen.findByRole("button", { name: "Agregar Blonde Ale 1000ml" });
      await waitFor(() => expect(add).not.toBeDisabled());
      fireEvent.click(add);
      await waitFor(async () =>
        expect(
          (await ports.orders.findByTable("table-2"))?.lineItems.some(
            (line) => line.productId === "product-blonde-1000",
          ),
        ).toBe(true),
      );
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Deshacer última adición" })).toBeInTheDocument(),
      );
      expect(document.querySelector("[data-sonner-toast]")).not.toBeInTheDocument();

      await waitFor(() => expect(add.querySelector('[aria-label="Guardando"]')).toBeNull());
      fireEvent.click(add);
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Deshacer lote" })).toBeInTheDocument(),
      );
      expect(await screen.findByText("2 productos agregados")).toBeInTheDocument();
      const before = await ports.orders.findByTable("table-2");
      expect(before?.lineItems.filter((line) => line.productId === "product-blonde-1000")).toHaveLength(2);
      const batchUndo = screen.getByRole("button", { name: "Deshacer lote" });
      fireEvent.click(batchUndo);
      fireEvent.click(batchUndo);
      await waitFor(async () => {
        const after = await ports.orders.findByTable("table-2");
        expect(after?.lineItems.filter((line) => line.productId === "product-blonde-1000")).toHaveLength(0);
      });
      expect(counts.at(-1)).toBe(
        before!.lineItems.reduce((sum, line) => sum + line.quantity, 0) - 2,
      );
    } finally {
      window.removeEventListener("kutana.order.updated", onUpdated);
    }
  });

  it("removes the line when the addition was its only unit", async () => {
    const ports = buildMockPorts();
    await seedOrderableProduct(ports);
    const original = await ports.orders.findByTable("table-2");
    render(
      <PortsProvider value={ports}>
        <Toaster />
        <AddItemContainer tableId="table-2" />
      </PortsProvider>,
    );
    const add = await screen.findByRole("button", { name: "Agregar Blonde Ale 1000ml" });
    await waitFor(() => expect(add).not.toBeDisabled());
    fireEvent.click(add);
    fireEvent.click(await screen.findByRole("button", { name: "Deshacer última adición" }));
    await waitFor(async () => {
      const after = await ports.orders.findByTable("table-2");
      expect(after?.lineItems).toEqual(original?.lineItems);
    });
  });

  it("does not remove another line when a stale toast's line was already removed", async () => {
    const ports = buildMockPorts();
    await seedOrderableProduct(ports);
    render(
      <PortsProvider value={ports}>
        <Toaster />
        <AddItemContainer tableId="table-2" />
      </PortsProvider>,
    );
    const add = await screen.findByRole("button", { name: "Agregar Blonde Ale 1000ml" });
    await waitFor(() => expect(add).not.toBeDisabled());
    fireEvent.click(add);
    await screen.findByRole("button", { name: "Deshacer última adición" });
    await waitFor(() => expect(add.querySelector('[aria-label="Guardando"]')).toBeNull());
    fireEvent.click(add);
    await waitFor(() => expect(screen.getByRole("button", { name: "Deshacer lote" })).toBeInTheDocument());
    const current = await ports.orders.findByTable("table-2");
    const added = current!.lineItems.filter((line) => line.productId === "product-blonde-1000");
    await ports.orders.save(removeLineItem(current!, added[0]!.id), current!.version);
    fireEvent.click(screen.getByRole("button", { name: "Deshacer lote" }));
    await waitFor(() =>
      expect(screen.getByText(/No se pudo deshacer esta adición/)).toBeInTheDocument(),
    );
    const after = await ports.orders.findByTable("table-2");
    expect(after?.lineItems.some((line) => line.id === added[1]!.id)).toBe(false);
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
