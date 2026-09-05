import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
  return ports;
}

describe("SplitBillContainer", () => {
  it("uses personal-account ports to create a customer account and assign quantity", async () => {
    const ports = await renderContainer();

    fireEvent.change(screen.getByLabelText("Cliente existente"), {
      target: { value: "customer-ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta de cliente" }));

    await waitFor(() =>
      expect(
        screen.getByRole("article", { name: /Saldo de cuenta de Ada Lovelace/ }),
      ).toBeInTheDocument(),
    );
    const order = await ports.orders.findByTable("table-1");
    const account = (await ports.personalAccounts.listByOrder(order!.id))[0]!;

    fireEvent.change(screen.getByLabelText(`Cantidad para ${order!.lineItems[0]!.nameSnapshot}`), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar cuenta Ada Lovelace" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Agregar" })[0]!);

    await waitFor(async () => {
      const allocations = await ports.personalAccounts.listAllocationsByOrder(order!.id);
      expect(allocations).toHaveLength(1);
      expect(allocations[0]).toMatchObject({ accountId: account.id, quantity: 1 });
    });
    expect(screen.getByRole("region", { name: "Productos pendientes" })).toHaveTextContent("1 sin asignar");
  });

  it("records account-level pay-now payments without using concrete adapters", async () => {
    const ports = await renderContainer();

    fireEvent.change(screen.getByLabelText("Cuenta con nombre libre"), { target: { value: "Juan P." } });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta libre" }));
    await waitFor(() =>
      expect(
        screen.getByRole("article", { name: "Saldo de cuenta de Juan P." }),
      ).toBeInTheDocument(),
    );

    const order = await ports.orders.findByTable("table-1");
    const account = (await ports.personalAccounts.listByOrder(order!.id))[0]!;
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar cuenta Juan P." }));
    fireEvent.click(screen.getAllByRole("button", { name: "Agregar" })[0]!);
    await waitFor(() => {
      expect(
        within(screen.getByRole("article", { name: "Saldo de cuenta de Juan P." })).getAllByText(
          "$3.92",
        ).length,
      ).toBeGreaterThan(0);
    });

    fireEvent.click(
      within(screen.getByRole("article", { name: "Saldo de cuenta de Juan P." })).getByRole(
        "button",
        { name: "Cobrar" },
      ),
    );

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

    fireEvent.change(screen.getByLabelText("Cuenta con nombre libre"), { target: { value: "Juan P." } });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta libre" }));
    await waitFor(() =>
      expect(
        screen.getByRole("article", { name: "Saldo de cuenta de Juan P." }),
      ).toBeInTheDocument(),
    );
    const order = await ports.orders.findByTable("table-1");
    const account = (await ports.personalAccounts.listByOrder(order!.id))[0]!;
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar cuenta Juan P." }));
    fireEvent.click(screen.getAllByRole("button", { name: "Agregar" })[0]!);
    await waitFor(() =>
      expect(
        within(screen.getByRole("article", { name: "Saldo de cuenta de Juan P." })).getAllByText(
          "$3.92",
        ).length,
      ).toBeGreaterThan(0),
    );

    fireEvent.click(
      within(screen.getByRole("article", { name: "Saldo de cuenta de Juan P." })).getByRole(
        "button",
        { name: "Dejar pendiente" },
      ),
    );

    await waitFor(async () =>
      expect((await ports.personalAccounts.findById(account.id))?.status).toBe("pending"),
    );
  });

  it("deletes a mistaken personal account and returns its items to unassigned", async () => {
    const ports = await renderContainer();

    fireEvent.change(screen.getByLabelText("Cuenta con nombre libre"), {
      target: { value: "Wrong name" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta libre" }));
    await waitFor(() =>
      expect(
        screen.getByRole("article", { name: "Saldo de cuenta de Wrong name" }),
      ).toBeInTheDocument(),
    );

    const order = await ports.orders.findByTable("table-1");
    const account = (await ports.personalAccounts.listByOrder(order!.id))[0]!;
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar cuenta Wrong name" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Agregar" })[0]!);
    await waitFor(() =>
      expect(
        within(
          screen.getByRole("article", { name: "Saldo de cuenta de Wrong name" }),
        ).getAllByText("$3.92").length,
      ).toBeGreaterThan(0),
    );

    fireEvent.click(
      within(screen.getByRole("article", { name: "Saldo de cuenta de Wrong name" })).getByRole(
        "button",
        { name: "Eliminar" },
      ),
    );

    await waitFor(async () => expect(await ports.personalAccounts.findById(account.id)).toBeNull());
    await expect(ports.personalAccounts.listAllocationsByOrder(order!.id)).resolves.toEqual([]);
    await waitFor(() =>
      expect(
        screen.queryByRole("article", { name: "Saldo de cuenta de Wrong name" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("region", { name: "Productos pendientes" })).toHaveTextContent("2 sin asignar");
  });

  it("marks unresolved closure attempts as review state", async () => {
    const ports = await renderContainer();

    fireEvent.click(screen.getByRole("button", { name: "Revisar cierre de mesa" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/revisión requerida/i));
    expect((await ports.orders.findByTable("table-1"))?.status).toBe("in_review");
  });
});
