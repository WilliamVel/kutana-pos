import { describe, expect, it } from "vitest";
import { MockOrderRepository } from "../adapters/mock/order-repository.js";
import { MockTableRepository } from "../adapters/mock/table-repository.js";
import { MockTicketRepository } from "../adapters/mock/ticket-repository.js";
import { MockPaymentRepository } from "../adapters/mock/payment-repository.js";
import { MockCategoryRepository } from "../adapters/mock/category-repository.js";
import { MockProductRepository } from "../adapters/mock/product-repository.js";
import { MockStockRepository } from "../adapters/mock/stock-repository.js";
import { MockOrderEvents } from "../adapters/mock/order-events.js";
import { buildMockPorts } from "./mock.js";

describe("buildMockPorts", () => {
  it("wires every port to its milestone-1 mock adapter implementation", () => {
    const ports = buildMockPorts();

    expect(ports.orders).toBeInstanceOf(MockOrderRepository);
    expect(ports.tables).toBeInstanceOf(MockTableRepository);
    expect(ports.tickets).toBeInstanceOf(MockTicketRepository);
    expect(ports.payments).toBeInstanceOf(MockPaymentRepository);
    expect(ports.products).toBeInstanceOf(MockProductRepository);
    expect(ports.categories).toBeInstanceOf(MockCategoryRepository);
    expect(ports.stock).toBeInstanceOf(MockStockRepository);
    expect(ports.events).toBeInstanceOf(MockOrderEvents);
  });

  it("wires the payment method registry to the real v1 seed data, never an ad-hoc list", () => {
    const ports = buildMockPorts();

    expect(ports.methods.length).toBeGreaterThan(0);
    expect(ports.methods.map((entry) => entry.label)).toContain("Cash");
  });

  it("returns a fresh set of adapters on every call, so tests never leak state across instances", () => {
    const first = buildMockPorts();
    const second = buildMockPorts();

    expect(first.orders).not.toBe(second.orders);
  });

  it("seeds the mock repositories with the demo fixtures so the UI has data on first render", async () => {
    const ports = buildMockPorts();

    const seededOrder = await ports.orders.findByTable("table-1");
    expect(seededOrder).not.toBeNull();
    expect(seededOrder?.id).toBe("order-open-1");

    const seededProduct = await ports.products.findById("product-pilsener-500");
    expect(seededProduct).not.toBeNull();

    const seededTables = await ports.tables.listAll();
    expect(seededTables.map((table) => table.id).sort()).toEqual([
      "table-1",
      "table-2",
      "table-3",
      "table-4",
      "table-5",
      "table-6",
    ]);

    const seededCategories = await ports.categories.listAll();
    expect(seededCategories.map((category) => category.name)).toContain("Draft Beer");
  });
});
