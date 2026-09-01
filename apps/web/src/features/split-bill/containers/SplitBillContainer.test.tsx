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
      screen.getByRole("heading", { name: "Table 1 — Personal accounts" }),
    ).toBeInTheDocument(),
  );
  return ports;
}

describe("SplitBillContainer", () => {
  it("uses personal-account ports to create a customer account and assign quantity", async () => {
    const ports = await renderContainer();

    fireEvent.change(screen.getByLabelText("Existing customer"), {
      target: { value: "customer-ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create customer account" }));

    await waitFor(() =>
      expect(
        screen.getByRole("article", { name: /Account balance for Ada Lovelace/ }),
      ).toBeInTheDocument(),
    );
    const order = await ports.orders.findByTable("table-1");
    const account = (await ports.personalAccounts.listByOrder(order!.id))[0]!;

    fireEvent.change(screen.getByLabelText(`Quantity for ${order!.lineItems[0]!.nameSnapshot}`), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Select account Ada Lovelace" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: `Add ${order!.lineItems[0]!.nameSnapshot} to selected account`,
      }),
    );

    await waitFor(async () => {
      const allocations = await ports.personalAccounts.listAllocationsByOrder(order!.id);
      expect(allocations).toHaveLength(1);
      expect(allocations[0]).toMatchObject({ accountId: account.id, quantity: 1 });
    });
    expect(screen.getByRole("region", { name: "Pending Items" })).toHaveTextContent("1 unassigned");
  });

  it("records account-level pay-now payments without using concrete adapters", async () => {
    const ports = await renderContainer();

    fireEvent.change(screen.getByLabelText("Free-name account"), { target: { value: "Juan P." } });
    fireEvent.click(screen.getByRole("button", { name: "Create free-name account" }));
    await waitFor(() =>
      expect(
        screen.getByRole("article", { name: "Account balance for Juan P." }),
      ).toBeInTheDocument(),
    );

    const order = await ports.orders.findByTable("table-1");
    const account = (await ports.personalAccounts.listByOrder(order!.id))[0]!;
    fireEvent.click(screen.getByRole("button", { name: "Select account Juan P." }));
    fireEvent.click(
      screen.getByRole("button", {
        name: `Add ${order!.lineItems[0]!.nameSnapshot} to selected account`,
      }),
    );
    await waitFor(() => {
      expect(
        within(screen.getByRole("article", { name: "Account balance for Juan P." })).getAllByText(
          "$3.92",
        ).length,
      ).toBeGreaterThan(0);
    });

    fireEvent.click(
      within(screen.getByRole("article", { name: "Account balance for Juan P." })).getByRole(
        "button",
        { name: "Pay now" },
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

    fireEvent.change(screen.getByLabelText("Free-name account"), { target: { value: "Juan P." } });
    fireEvent.click(screen.getByRole("button", { name: "Create free-name account" }));
    await waitFor(() =>
      expect(
        screen.getByRole("article", { name: "Account balance for Juan P." }),
      ).toBeInTheDocument(),
    );
    const order = await ports.orders.findByTable("table-1");
    const account = (await ports.personalAccounts.listByOrder(order!.id))[0]!;
    fireEvent.click(screen.getByRole("button", { name: "Select account Juan P." }));
    fireEvent.click(
      screen.getByRole("button", {
        name: `Add ${order!.lineItems[0]!.nameSnapshot} to selected account`,
      }),
    );
    await waitFor(() =>
      expect(
        within(screen.getByRole("article", { name: "Account balance for Juan P." })).getAllByText(
          "$3.92",
        ).length,
      ).toBeGreaterThan(0),
    );

    fireEvent.click(
      within(screen.getByRole("article", { name: "Account balance for Juan P." })).getByRole(
        "button",
        { name: "Mark pending" },
      ),
    );

    await waitFor(async () =>
      expect((await ports.personalAccounts.findById(account.id))?.status).toBe("pending"),
    );
  });

  it("deletes a mistaken personal account and returns its items to unassigned", async () => {
    const ports = await renderContainer();

    fireEvent.change(screen.getByLabelText("Free-name account"), {
      target: { value: "Wrong name" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create free-name account" }));
    await waitFor(() =>
      expect(
        screen.getByRole("article", { name: "Account balance for Wrong name" }),
      ).toBeInTheDocument(),
    );

    const order = await ports.orders.findByTable("table-1");
    const account = (await ports.personalAccounts.listByOrder(order!.id))[0]!;
    fireEvent.click(screen.getByRole("button", { name: "Select account Wrong name" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: `Add ${order!.lineItems[0]!.nameSnapshot} to selected account`,
      }),
    );
    await waitFor(() =>
      expect(
        within(
          screen.getByRole("article", { name: "Account balance for Wrong name" }),
        ).getAllByText("$3.92").length,
      ).toBeGreaterThan(0),
    );

    fireEvent.click(
      within(screen.getByRole("article", { name: "Account balance for Wrong name" })).getByRole(
        "button",
        { name: "Delete account" },
      ),
    );

    await waitFor(async () => expect(await ports.personalAccounts.findById(account.id)).toBeNull());
    await expect(ports.personalAccounts.listAllocationsByOrder(order!.id)).resolves.toEqual([]);
    await waitFor(() =>
      expect(
        screen.queryByRole("article", { name: "Account balance for Wrong name" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("region", { name: "Pending Items" })).toHaveTextContent("2 unassigned");
  });

  it("marks unresolved closure attempts as review state", async () => {
    const ports = await renderContainer();

    fireEvent.click(screen.getByRole("button", { name: "Review table closure" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/review required/i));
    expect((await ports.orders.findByTable("table-1"))?.status).toBe("in_review");
  });
});
