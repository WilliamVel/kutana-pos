import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PaymentMethodRegistry } from "@kutana/shared/payments/model/payment-method-registry.js";
import type { Ports } from "./ports.js";
import {
  PortsProvider,
  useCategories,
  useCustomerDebts,
  useCustomers,
  useOrderEvents,
  useOrders,
  usePaymentMethods,
  usePayments,
  usePersonalAccounts,
  usePorts,
  useProducts,
  useStock,
  useTables,
  useTickets,
} from "./PortsProvider.js";

const TEST_METHODS: PaymentMethodRegistry = [
  {
    code: "CASH" as PaymentMethodRegistry[number]["code"],
    label: "Cash",
    requiresTendered: true,
    active: true,
    sortOrder: 1,
  },
];

function makeFakePorts(overrides: Partial<Ports> = {}): Ports {
  return {
    orders: {
      findByTable: async () => null,
      listAll: async () => [],
      save: async (order) => order,
    } as Ports["orders"],
    tables: {
      listAll: async () => [],
      findById: async () => null,
      save: async (table) => table,
    } as Ports["tables"],
    tickets: {
      findById: async () => null,
      listByOrder: async () => [],
      listAllocationsByOrder: async () => [],
      save: async (ticket) => ticket,
    } as Ports["tickets"],
    customers: {
      findById: async () => null,
      listAll: async () => [],
      search: async () => [],
      save: async (customer) => customer,
      delete: async () => {},
    } as Ports["customers"],
    personalAccounts: {
      findById: async () => null,
      listByOrder: async () => [],
      listPendingFreeName: async () => [],
      listAllocationsByOrder: async () => [],
      save: async (account) => account,
      delete: async () => {},
    } as Ports["personalAccounts"],
    customerDebts: {
      listByCustomer: async () => [],
      listAll: async () => [],
      record: async (entry) => entry,
    } as Ports["customerDebts"],
    payments: {
      listByTarget: async () => [],
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
    categories: {
      findById: async () => null,
      listAll: async () => [],
      save: async (category) => category,
      delete: async () => {},
    } as Ports["categories"],
    stock: {
      findById: async () => null,
      listLowStock: async () => [],
      listMovements: async () => [],
      recordMovement: async (item) => item,
    } as Ports["stock"],
    paymentMethods: { listAll: async () => TEST_METHODS } as Ports["paymentMethods"],
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

  it("exposes each port through its dedicated typed hook", async () => {
    const ports = makeFakePorts();

    function Probe(): JSX.Element {
      return (
        <>
          <span data-testid="orders">{String(useOrders() === ports.orders)}</span>
          <span data-testid="tables">{String(useTables() === ports.tables)}</span>
          <span data-testid="tickets">{String(useTickets() === ports.tickets)}</span>
          <span data-testid="customers">{String(useCustomers() === ports.customers)}</span>
          <span data-testid="personalAccounts">
            {String(usePersonalAccounts() === ports.personalAccounts)}
          </span>
          <span data-testid="customerDebts">
            {String(useCustomerDebts() === ports.customerDebts)}
          </span>
          <span data-testid="payments">{String(usePayments() === ports.payments)}</span>
          <span data-testid="products">{String(useProducts() === ports.products)}</span>
          <span data-testid="categories">{String(useCategories() === ports.categories)}</span>
          <span data-testid="stock">{String(useStock() === ports.stock)}</span>
          <span data-testid="methods">{usePaymentMethods().length}</span>
          <span data-testid="events">{String(useOrderEvents() === ports.events)}</span>
        </>
      );
    }

    render(
      <PortsProvider value={ports}>
        <Probe />
      </PortsProvider>,
    );

    for (const id of [
      "orders",
      "tables",
      "tickets",
      "customers",
      "personalAccounts",
      "customerDebts",
      "payments",
      "products",
      "categories",
      "stock",
      "events",
    ]) {
      expect(screen.getByTestId(id).textContent).toBe("true");
    }
    await waitFor(() => expect(screen.getByTestId("methods").textContent).toBe("1"));
  });

  it("throws a descriptive error when a hook is used outside PortsProvider", () => {
    // Suppress React's expected console.error noise for this negative test.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<OrdersProbe />)).toThrow(/PortsProvider/);
    spy.mockRestore();
  });
});
