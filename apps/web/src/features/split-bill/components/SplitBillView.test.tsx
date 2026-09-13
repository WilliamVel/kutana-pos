import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  SplitBillView,
  type AccountAssignmentAccount,
  type AccountAssignmentLine,
} from "./SplitBillView.js";

const LINE: AccountAssignmentLine = {
  id: "line-a",
  lineItemIds: ["line-a"],
  name: "KUTANA Pilsener 500ml",
  quantity: 2,
  unitPriceCents: 350,
  totalCents: 784,
  unassignedQuantity: 1,
};

const ACCOUNT: AccountAssignmentAccount = {
  id: "account-a",
  ownerLabel: "Juan P.",
  owner: { kind: "free_name", freeName: "Juan P." },
  status: "open",
  totalCents: 392,
  paidCents: 0,
  remainingCents: 392,
};

function renderView(overrides: Partial<React.ComponentProps<typeof SplitBillView>> = {}) {
  const props: React.ComponentProps<typeof SplitBillView> = {
    tableLabel: "Table 1",
    customers: [
      {
        id: "customer-1",
        displayName: "Ada",
        phone: null,
        email: null,
        notes: null,
        createdAt: "now",
        updatedAt: "now",
      },
    ],
    selectedCustomerId: "",
    freeName: "",
    lines: [LINE],
    accounts: [ACCOUNT],
    allocationDraft: { accountId: "", lineItemId: "", quantity: "1" },
    reviewMessage: null,
    onSelectCustomer: vi.fn(),
    onFreeNameChange: vi.fn(),
    onCreateCustomerAccount: vi.fn(),
    onCreateFreeNameAccount: vi.fn(),
    onAllocationDraftChange: vi.fn(),
    onAssignQuantity: vi.fn(),
    onPayAccount: vi.fn(),
    onMarkPending: vi.fn(),
    onDeleteAccount: vi.fn(),
    onAttemptClose: vi.fn(),
    ...overrides,
  };
  render(<SplitBillView {...props} />);
  return props;
}

describe("SplitBillView", () => {
  it("renders account assignment instead of two anonymous bills", () => {
    renderView();

    expect(
      screen.getByRole("heading", { name: "Table 1 — Cuentas personales" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Productos pendientes" })).toHaveTextContent("1 sin asignar");
    expect(screen.getByRole("article", { name: "Saldo de cuenta de Juan P." })).toHaveTextContent(
      "Restante",
    );
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
  });

  it("exposes customer, free-name, quantity assignment, payment, pending, and review actions", () => {
    const props = renderView({
      selectedCustomerId: "customer-1",
      freeName: "Mesa amiga",
      allocationDraft: { accountId: "account-a", lineItemId: "line-a", quantity: "1" },
    });

    fireEvent.change(screen.getByLabelText("Cliente existente"), {
      target: { value: "customer-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta de cliente" }));
    fireEvent.change(screen.getByLabelText("Cuenta con nombre libre"), {
      target: { value: "Mesa amiga 2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta libre" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar cuenta seleccionada Juan P." }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
    fireEvent.click(screen.getByRole("button", { name: "Cobrar" }));
    fireEvent.click(screen.getByRole("button", { name: "Dejar pendiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar Juan P. de esta división" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    fireEvent.click(screen.getByRole("button", { name: "Revisar cierre de mesa" }));

    expect(props.onSelectCustomer).toHaveBeenCalledWith("customer-1");
    expect(props.onFreeNameChange).toHaveBeenCalledWith("Mesa amiga 2");
    expect(props.onCreateCustomerAccount).toHaveBeenCalled();
    expect(props.onCreateFreeNameAccount).toHaveBeenCalled();
    expect(props.onAllocationDraftChange).toHaveBeenCalledWith({
      accountId: "",
      lineItemId: "line-a",
      quantity: "1",
    });
    expect(props.onAssignQuantity).toHaveBeenCalledWith({
      accountId: "account-a",
      lineItemId: "line-a",
      quantity: "1",
    });
    expect(props.onPayAccount).toHaveBeenCalledWith("account-a");
    expect(props.onMarkPending).toHaveBeenCalledWith("account-a");
    expect(props.onDeleteAccount).toHaveBeenCalledWith("account-a");
    expect(props.onAttemptClose).toHaveBeenCalled();
  });

  it("opens payment details for a customer or free-name account", () => {
    renderView({
      accounts: [{
        ...ACCOUNT,
        payments: [{ id: "payment-1", amountCents: 200, methodLabel: "Efectivo", recordedAt: "2026-01-02T12:00:00.000Z" }],
        assignedLines: [{ allocationIds: ["allocation-1"], name: "KUTANA Pilsener 500ml", quantity: 1 }],
      }],
    });

    fireEvent.click(screen.getByRole("button", { name: "Ver pagos de Juan P." }));

    expect(screen.getByRole("dialog", { name: "Juan P." })).toHaveTextContent("Efectivo");
    expect(screen.getByRole("dialog", { name: "Juan P." })).toHaveTextContent("KUTANA Pilsener 500ml");
    fireEvent.click(screen.getByRole("button", { name: "Cerrar detalle de pagos" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("allows clicking the selected account again to clear the selection", () => {
    const props = renderView({
      allocationDraft: { accountId: "account-a", lineItemId: "", quantity: "1" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Quitar cuenta seleccionada Juan P." }));

    expect(props.onAllocationDraftChange).toHaveBeenCalledWith({
      accountId: "",
      lineItemId: "",
      quantity: "1",
    });
  });

  it("shows an alert when there are no products to divide or pay", () => {
    renderView({ lines: [] });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Para dividir la cuenta o cobrar debe existir al menos un producto para pagar.",
    );
  });

  it("groups split-bill work into clear account sections", () => {
    renderView();

    expect(screen.getByRole("region", { name: "Configuración de cuentas" })).toHaveTextContent(
      "Elegí quién necesita una cuenta propia antes de asignar productos.",
    );
    expect(screen.getByRole("region", { name: "Asignar productos" })).toHaveTextContent(
      "Seleccioná una cuenta y asignale cantidades. Si repetís un producto, la cantidad se acumula.",
    );
    expect(screen.getByRole("region", { name: "Productos pendientes" })).toHaveTextContent(
      "KUTANA Pilsener 500ml",
    );
    expect(screen.getByRole("region", { name: "Cuenta seleccionada" })).toHaveTextContent(
      "Elegí la cuenta que va a recibir los productos.",
    );
    expect(screen.getByRole("button", { name: "Seleccionar cuenta Juan P." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Saldos de cuentas" })).toHaveTextContent(
      "Revisá el total, lo pagado y el saldo restante de cada cuenta.",
    );
    expect(screen.getByRole("article", { name: "Saldo de cuenta de Juan P." })).toHaveTextContent(
      "Total",
    );
    expect(screen.getByRole("article", { name: "Saldo de cuenta de Juan P." })).toHaveTextContent(
      "Pagado",
    );
    expect(screen.getByRole("article", { name: "Saldo de cuenta de Juan P." })).toHaveTextContent(
      "Restante",
    );
  });

  it("shows review state feedback for unresolved table closure", () => {
    renderView({ reviewMessage: "Review required: 1 line item has unassigned quantities." });

    expect(screen.getByRole("alert")).toHaveTextContent(/review required/i);
  });
});
