import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Ports } from "./ports.js";
import {
  PortsProvider,
  useOrderEvents,
  useOrders,
  usePaymentMethods,
  usePayments,
  usePorts,
  useProducts,
  useStock,
  useTickets,
} from "./PortsProvider.js";

function makeFakePorts(overrides: Partial<Ports> = {}): Ports {
  return {
    orders: { findByTable: async () => null, save: async (order) => order } as Ports["orders"],
    tickets: {
      findById: async () => null,
      listByOrder: async () => [],
      listAllocationsByOrder: async () => [],
      save: async (ticket) => ticket,
    } as Ports["tickets"],
    payments: {
      listByTicket: async () => [],
      record: async (payment) => payment,
    } as Ports["payments"],
    products: {
      findById: async () => null,
      findBySku: async () => null,
      findByBarcode: async () => null,
      listByCategory: async () => [],
      save: async (product) => product,
    } as Ports["products"],
    stock: {
      findById: async () => null,
      listLowStock: async () => [],
      listMovements: async () => [],
      recordMovement: async (item) => item,
    } as Ports["stock"],
    methods: [],
    events: { subscribe: () => () => {}, publish: () => {} } as Ports["events"],
    ...overrides,
  };
}

function OrdersProbe(): JSX.Element {
  const orders = useOrders();
  return <span data-testid="probe">{typeof orders.findByTable}</span>;
}

describe("PortsProvider", () => {
  it("provides the exact Ports object passed to it via usePorts()", () => {
    const ports = makeFakePorts();
    let seen: Ports | undefined;

    function Probe(): JSX.Element {
      seen = usePorts();
      return <></>;
    }

    render(
      <PortsProvider value={ports}>
        <Probe />
      </PortsProvider>,
    );

    expect(seen).toBe(ports);
  });

  it("exposes each port through its dedicated typed hook", () => {
    const ports = makeFakePorts();

    function Probe(): JSX.Element {
      return (
        <>
          <span data-testid="orders">{String(useOrders() === ports.orders)}</span>
          <span data-testid="tickets">{String(useTickets() === ports.tickets)}</span>
          <span data-testid="payments">{String(usePayments() === ports.payments)}</span>
          <span data-testid="products">{String(useProducts() === ports.products)}</span>
          <span data-testid="stock">{String(useStock() === ports.stock)}</span>
          <span data-testid="methods">{String(usePaymentMethods() === ports.methods)}</span>
          <span data-testid="events">{String(useOrderEvents() === ports.events)}</span>
        </>
      );
    }

    render(
      <PortsProvider value={ports}>
        <Probe />
      </PortsProvider>,
    );

    for (const id of ["orders", "tickets", "payments", "products", "stock", "methods", "events"]) {
      expect(screen.getByTestId(id).textContent).toBe("true");
    }
  });

  it("throws a descriptive error when a hook is used outside PortsProvider", () => {
    // Suppress React's expected console.error noise for this negative test.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<OrdersProbe />)).toThrow(/PortsProvider/);
    spy.mockRestore();
  });
});
