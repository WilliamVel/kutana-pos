import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createCustomer } from "@kutana/shared/billing/model/personal-account.js";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import { buildMockPorts } from "../../../composition/mock.js";
import { SplitBillContainer } from "./SplitBillContainer.js";

async function renderContainer() {
  const ports = buildMockPorts();
  await ports.customers.save(
    createCustomer({
      id: "customer-ada",
      displayName: "Ada Lovelace",
      now: "2025-01-01T00:00:00.000Z",
    }),
  );
  render(
    <PortsProvider value={ports}>
      <SplitBillContainer tableId="table-1" />
    </PortsProvider>,
  );
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "Table 1 — Cuentas personales" }),
    ).toBeInTheDocument(),
  );
  fireEvent.click(screen.getByRole("button", { name: /Por persona/ }));
  return ports;
}

describe("SplitBillContainer", () => {
  it("uses personal-account ports to create a customer account and assign quantity", async () => {
    const ports = await renderContainer();

    fireEvent.click(screen.getByRole("button", { name: "Agregar persona" }));
    fireEvent.change(screen.getByLabelText("Cliente existente"), {
      target: { value: "customer-ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta de cliente" }));

    await waitFor(() =>
      expect(
        screen.getByRole("tab", { name: "Seleccionar cuenta Ada Lovelace" }),
      ).toBeInTheDocument(),
    );
    const order = await ports.orders.findByTable("table-1");
    const account = (await ports.personalAccounts.listByOrder(order!.id))[0]!;

    fireEvent.change(screen.getByLabelText(`Cantidad para ${order!.lineItems[0]!.nameSnapshot}`), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Asignar" })[0]!);

    await waitFor(async () => {
      const allocations = await ports.personalAccounts.listAllocationsByOrder(order!.id);
      expect(allocations).toHaveLength(1);
      expect(allocations[0]).toMatchObject({ accountId: account.id, quantity: 1 });
    });
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /Sin asignar 2/ })).toBeInTheDocument(),
    );
  });

  it("records account-level pay-now payments without using concrete adapters", async () => {
    const ports = await renderContainer();

    fireEvent.click(screen.getByRole("button", { name: "Agregar persona" }));
    fireEvent.change(screen.getByLabelText("Cuenta con nombre libre"), {
      target: { value: "Juan P." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta libre" }));
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Seleccionar cuenta Juan P." })).toBeInTheDocument(),
    );

    const order = await ports.orders.findByTable("table-1");
    const account = (await ports.personalAccounts.listByOrder(order!.id))[0]!;
    fireEvent.click(screen.getAllByRole("button", { name: "Asignar" })[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Volver a la cuenta" }));
    await waitFor(() => {
      expect(
        within(screen.getByRole("article", { name: "Saldo de cuenta de Juan P." })).getAllByText(
          "$3.92",
        ).length,
      ).toBeGreaterThan(0);
    });

    await waitFor(() =>
      expect(
        within(screen.getByRole("article", { name: "Saldo de cuenta de Juan P." })).getByRole(
          "button",
          { name: /Cobrar ·/ },
        ),
      ).toBeInTheDocument(),
    );
    const payButton = within(
      screen.getByRole("article", { name: "Saldo de cuenta de Juan P." }),
    ).getByRole("button", { name: /Cobrar ·/ });
    await waitFor(() => expect(payButton).toBeEnabled());
    fireEvent.click(payButton);

    await waitFor(async () => {
      const payments = await ports.payments.listByTarget({
        kind: "personal_account",
        accountId: account.id,
      });
      expect(payments).toHaveLength(1);
      expect((await ports.personalAccounts.findById(account.id))?.status).toBe("paid");
    });
  });

  it("marks account-level balances pending", async () => {
    const ports = await renderContainer();

    fireEvent.click(screen.getByRole("button", { name: "Agregar persona" }));
    fireEvent.change(screen.getByLabelText("Cuenta con nombre libre"), {
      target: { value: "Juan P." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta libre" }));
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Seleccionar cuenta Juan P." })).toBeInTheDocument(),
    );
    const order = await ports.orders.findByTable("table-1");
    const account = (await ports.personalAccounts.listByOrder(order!.id))[0]!;
    fireEvent.click(screen.getAllByRole("button", { name: "Asignar" })[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Volver a la cuenta" }));
    await waitFor(() =>
      expect(
        within(screen.getByRole("article", { name: "Saldo de cuenta de Juan P." })).getAllByText(
          "$3.92",
        ).length,
      ).toBeGreaterThan(0),
    );

    const pendingButton = within(
      screen.getByRole("article", { name: "Saldo de cuenta de Juan P." }),
    ).getByRole("button", { name: "Dejar pendiente" });
    await waitFor(() => expect(pendingButton).toBeEnabled());
    fireEvent.click(pendingButton);

    await waitFor(async () =>
      expect((await ports.personalAccounts.findById(account.id))?.status).toBe("pending"),
    );
  });

  it("removes a person from this split from step two without deleting the customer", async () => {
    const ports = await renderContainer();

    fireEvent.click(screen.getByRole("button", { name: "Agregar persona" }));
    fireEvent.change(screen.getByLabelText("Cliente existente"), {
      target: { value: "customer-ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta de cliente" }));
    await waitFor(() =>
      expect(
        screen.getByRole("tab", { name: "Seleccionar cuenta Ada Lovelace" }),
      ).toBeInTheDocument(),
    );

    const order = await ports.orders.findByTable("table-1");
    const account = (await ports.personalAccounts.listByOrder(order!.id))[0]!;
    fireEvent.click(screen.getByRole("button", { name: "Volver a la cuenta" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar persona de la división" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar persona" }));

    await waitFor(async () => expect(await ports.personalAccounts.findById(account.id)).toBeNull());
    await expect(ports.customers.findById("customer-ada")).resolves.toMatchObject({
      displayName: "Ada Lovelace",
    });
    await waitFor(() =>
      expect(
        screen.queryByRole("article", { name: /Saldo de cuenta de Ada Lovelace/ }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByText(/selecciona una persona/)).toBeInTheDocument();
  });

  it("deletes a mistaken personal account and returns its items to unassigned", async () => {
    const ports = await renderContainer();

    fireEvent.click(screen.getByRole("button", { name: "Agregar persona" }));
    fireEvent.change(screen.getByLabelText("Cuenta con nombre libre"), {
      target: { value: "Wrong name" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta libre" }));
    await waitFor(() =>
      expect(
        screen.getByRole("tab", { name: "Seleccionar cuenta Wrong name" }),
      ).toBeInTheDocument(),
    );

    const order = await ports.orders.findByTable("table-1");
    const account = (await ports.personalAccounts.listByOrder(order!.id))[0]!;
    fireEvent.click(screen.getAllByRole("button", { name: "Asignar" })[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Volver a la cuenta" }));
    await waitFor(() =>
      expect(
        within(screen.getByRole("article", { name: "Saldo de cuenta de Wrong name" })).getAllByText(
          "$3.92",
        ).length,
      ).toBeGreaterThan(0),
    );

    const deleteButton = within(
      screen.getByRole("article", { name: "Saldo de cuenta de Wrong name" }),
    ).getByRole("button", { name: "Quitar persona de la división" });
    await waitFor(() => expect(deleteButton).toBeEnabled());
    fireEvent.click(deleteButton);
    fireEvent.click(screen.getByRole("button", { name: "Quitar y devolver productos" }));

    await waitFor(async () => expect(await ports.personalAccounts.findById(account.id)).toBeNull());
    await expect(ports.personalAccounts.listAllocationsByOrder(order!.id)).resolves.toEqual([]);
    await waitFor(() =>
      expect(
        screen.queryByRole("article", { name: "Saldo de cuenta de Wrong name" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("tab", { name: /Sin asignar 3/ })).toBeInTheDocument();
  });

  it("delegates a valid closure to the payment-closure port", async () => {
    const ports = await renderContainer();
    const closeOrder = vi.spyOn(ports.paymentClosure, "closeOrder");

    fireEvent.click(screen.getByRole("button", { name: "Agregar persona" }));
    fireEvent.change(screen.getByLabelText("Cuenta con nombre libre"), {
      target: { value: "Juan P." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta libre" }));
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Seleccionar cuenta Juan P." })).toBeInTheDocument(),
    );
    const order = await ports.orders.findByTable("table-1");
    const account = (await ports.personalAccounts.listByOrder(order!.id))[0]!;
    fireEvent.change(screen.getByLabelText(`Cantidad para ${order!.lineItems[0]!.nameSnapshot}`), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Asignar" })[0]!);
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /Sin asignar 1/ })).toBeInTheDocument(),
    );
    const finalAssignButton = within(
      screen.getByRole("article", { name: "Asignar Loaded Nachos" }),
    ).getByRole("button", {
      name: "Asignar",
    });
    await waitFor(() => expect(finalAssignButton).toBeEnabled());
    fireEvent.click(finalAssignButton);
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /Sin asignar 0/ })).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        within(screen.getByRole("article", { name: "Saldo de cuenta de Juan P." })).getByRole(
          "button",
          { name: /Cobrar ·/ },
        ),
      ).toBeInTheDocument(),
    );
    const closePayButton = within(
      screen.getByRole("article", { name: "Saldo de cuenta de Juan P." }),
    ).getByRole("button", { name: /Cobrar ·/ });
    await waitFor(() => expect(closePayButton).toBeEnabled());
    fireEvent.click(closePayButton);
    await waitFor(async () =>
      expect((await ports.personalAccounts.findById(account.id))?.status).toBe("paid"),
    );
    await ports.paymentClosure.closeOrder(order!.id);
    expect(closeOrder).toHaveBeenCalledWith(order!.id);
  });

  it("marks unresolved closure attempts as review state", async () => {
    const ports = await renderContainer();

    fireEvent.click(screen.getByRole("button", { name: "Revisar cierre de mesa" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/revisión requerida/i));
    expect((await ports.orders.findByTable("table-1"))?.status).toBe("in_review");
  });
});
