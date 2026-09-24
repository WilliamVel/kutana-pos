import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createCustomerDebtEntry } from "@kutana/shared/billing/model/customer-debt-ledger.js";
import { createAccountLineAllocation, createCustomer, createPersonalAccount } from "@kutana/shared/billing/model/personal-account.js";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import { buildMockPorts } from "../../../composition/mock.js";
import { PendingDebtsContainer } from "./PendingDebtsContainer.js";

async function seedIdentifiedDebt() {
  const ports = buildMockPorts();
  await ports.customers.save(createCustomer({ id: "customer-ada", displayName: "Ada Lovelace", now: "2025-01-01T00:00:00.000Z" }));
  const order = await ports.orders.findByTable("table-1");
  if (!order) throw new Error("Missing seeded order");
  await ports.orders.save({ ...order, status: "closed_with_pending", closedAt: "2025-01-01T01:00:00.000Z" }, order.version);
  await ports.customerDebts.record(createCustomerDebtEntry({
    id: "debt-1",
    customerId: "customer-ada",
    direction: "debit",
    kind: "pending_account",
    amountCents: 1500,
    accountId: "account-ada",
    createdAt: "2025-01-01T01:00:00.000Z",
  }));
  return { ports, orderId: order.id };
}

async function seedFreeNameDebt(displayName = "Juan P.") {
  const ports = buildMockPorts();
  await ports.customers.save(createCustomer({ id: "customer-juan", displayName, now: "2025-01-01T00:00:00.000Z" }));
  const order = await ports.orders.findByTable("table-1");
  if (!order) throw new Error("Missing seeded order");
  const account = { ...createPersonalAccount({ id: "account-juan", orderId: order.id, freeName: displayName, createdAt: "2025-01-01T00:30:00.000Z" }), status: "pending" as const };
  const allocation = createAccountLineAllocation({ id: "allocation-juan", accountId: account.id, lineItemId: order.lineItems[0]!.id, quantity: 1 });
  await ports.personalAccounts.save(account, [allocation], 0);
  await ports.orders.save({ ...order, status: "closed_with_pending", closedAt: "2025-01-01T01:00:00.000Z" }, order.version);
  return { ports, account, orderId: order.id };
}

function renderContainer(ports: ReturnType<typeof buildMockPorts>) {
  render(
    <PortsProvider value={ports}>
      <PendingDebtsContainer />
    </PortsProvider>,
  );
}

describe("PendingDebtsContainer", () => {
  it("groups identified customer debts and records partial payments without reopening original orders", async () => {
    const { ports } = await seedIdentifiedDebt();
    renderContainer(ports);

    await waitFor(() => expect(screen.getByRole("article", { name: "Deuda de Ada Lovelace" })).toBeInTheDocument());
    const row = screen.getByRole("article", { name: "Deuda de Ada Lovelace" });
    expect(row).toHaveTextContent("$15.00");

    fireEvent.click(within(row).getByRole("button", { name: "Cobrar a Ada Lovelace" }));
    fireEvent.change(screen.getByLabelText("Importe del pago (USD)"), { target: { value: "5.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar pago" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/sin reabrir/i));
    await waitFor(() => expect(screen.getByRole("article", { name: "Deuda de Ada Lovelace" })).toHaveTextContent("$10.00"));
    expect((await ports.orders.findByTable("table-1"))?.status).toBe("closed_with_pending");
    expect(await ports.payments.listByTarget({ kind: "customer_debt", customerId: "customer-ada" })).toHaveLength(1);
  });

  it("lists unlinked free-name pending accounts separately and never auto-merges matching customer names", async () => {
    const { ports } = await seedFreeNameDebt("Juan P.");
    renderContainer(ports);

    await waitFor(() => expect(screen.getByRole("article", { name: "Cuenta pendiente de Juan P." })).toBeInTheDocument());
    expect(screen.getByRole("region", { name: "Deudas de clientes identificados" })).toHaveTextContent("No hay deudas de clientes identificados");
    expect(await ports.customerDebts.listByCustomer("customer-juan")).toHaveLength(0);
  });

  it("records payments against free-name pending accounts", async () => {
    const { ports, account } = await seedFreeNameDebt();
    renderContainer(ports);

    await waitFor(() => expect(screen.getByRole("article", { name: "Cuenta pendiente de Juan P." })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Monto de pago para Juan P. (USD)"), { target: { value: "1.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar pago" }));

    await waitFor(async () => expect(await ports.payments.listByTarget({ kind: "personal_account", accountId: account.id })).toHaveLength(1));
    expect((await ports.personalAccounts.findById(account.id))?.status).toBe("pending");
    expect((await ports.orders.findByTable("table-1"))?.status).toBe("closed_with_pending");
  });

  it("links a free-name pending account to an existing customer", async () => {
    const { ports, account } = await seedFreeNameDebt();
    renderContainer(ports);

    await waitFor(() => expect(screen.getByRole("article", { name: "Cuenta pendiente de Juan P." })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Vincular con cliente existente"), { target: { value: "customer-juan" } });
    fireEvent.click(screen.getByRole("button", { name: "Vincular cuenta" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/vinculada a un cliente existente/i));
    expect((await ports.personalAccounts.findById(account.id))?.owner).toMatchObject({ kind: "customer", customerId: "customer-juan" });
    expect(await ports.customerDebts.listByCustomer("customer-juan")).toHaveLength(1);
  });

  it("creates a customer from a free-name pending account and links the account", async () => {
    const { ports, account } = await seedFreeNameDebt("Lina M.");
    renderContainer(ports);

    await waitFor(() => expect(screen.getByRole("article", { name: "Cuenta pendiente de Lina M." })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Crear cliente desde nombre libre" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/cliente creado/i));
    const saved = await ports.personalAccounts.findById(account.id);
    expect(saved?.owner.kind).toBe("customer");
    const customers = await ports.customers.listAll();
    expect(customers.some((customer) => customer.displayName === "Lina M.")).toBe(true);
  });
});
