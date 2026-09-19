import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SplitBillView, type AccountAssignmentAccount, type AccountAssignmentLine } from "./SplitBillView.js";

const LINE: AccountAssignmentLine = {
  id: "line-a",
  lineItemIds: ["line-a"],
  name: "KUTANA Pilsener 500ml",
  quantity: 2,
  unitPriceCents: 392,
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
  assignedLines: [{ allocationIds: ["allocation-a"], name: "KUTANA Pilsener 500ml", quantity: 1, totalCents: 392 }],
};

function renderView(overrides: Partial<React.ComponentProps<typeof SplitBillView>> = {}) {
  const props: React.ComponentProps<typeof SplitBillView> = {
    tableLabel: "Table 1",
    tableTotalCents: 784,
    tableRemainingCents: 784,
    customers: [{ id: "customer-1", displayName: "Ada", phone: null, email: null, notes: null, createdAt: "now", updatedAt: "now" }],
    selectedCustomerId: "",
    freeName: "",
    lines: [LINE],
    accounts: [],
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
    onRemoveAllocation: vi.fn(),
    onAttemptClose: vi.fn(),
    onPayOrder: vi.fn(),
    ...overrides,
  };
  render(<SplitBillView {...props} />);
  return props;
}

describe("SplitBillView", () => {
  it("starts with a compact split-method choice and persistent total", () => {
    renderView();
    expect(screen.getByRole("heading", { name: "¿Cómo quieres dividir la cuenta?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Por persona/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Partes iguales/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Por monto/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Resumen de la mesa")).toHaveTextContent("Saldo pendiente$7.84");
  });

  it("uses account tabs as navigation and assigns compact row quantities", () => {
    const props = renderView({ accounts: [ACCOUNT], allocationDraft: { accountId: "account-a", lineItemId: "line-a", quantity: "1" } });
    const row = screen.getByRole("article", { name: "Asignar KUTANA Pilsener 500ml" });
    expect(within(row).queryByLabelText("Cantidad para KUTANA Pilsener 500ml")).not.toBeInTheDocument();
    fireEvent.click(within(row).getByRole("button", { name: "Agregar" }));
    expect(props.onAssignQuantity).toHaveBeenCalledWith({ accountId: "account-a", lineItemId: "line-a", quantity: "1" });
  });

  it("assigns multiple selected products to the active person", () => {
    const onAssignQuantities = vi.fn();
    const secondLine = { ...LINE, id: "line-b", lineItemIds: ["line-b"], name: "Loaded Nachos" };
    renderView({
      accounts: [ACCOUNT],
      lines: [LINE, secondLine],
      allocationDraft: { accountId: "account-a", lineItemId: "", quantity: "1" },
      onAssignQuantities,
    });

    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar KUTANA Pilsener 500ml" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Loaded Nachos" }));
    fireEvent.click(screen.getByRole("button", { name: "Asignar a Juan P." }));

    expect(onAssignQuantities).toHaveBeenCalledWith([
      { accountId: "account-a", lineItemId: "line-a", quantity: "1" },
      { accountId: "account-a", lineItemId: "line-b", quantity: "1" },
    ]);
  });

  it("confirms before changing methods when account work could be affected", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderView({ accounts: [ACCOUNT], allocationDraft: { accountId: "account-a", lineItemId: "", quantity: "1" } });

    fireEvent.click(screen.getByRole("button", { name: "Partes iguales" }));
    expect(confirm).toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "División en partes iguales" })).not.toBeInTheDocument();

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Partes iguales" }));
    expect(screen.getByRole("region", { name: "División en partes iguales" })).toBeInTheDocument();
    confirm.mockRestore();
  });

  it("creates people from a compact modal", () => {
    const props = renderView({ selectedCustomerId: "customer-1" });
    fireEvent.click(screen.getByRole("button", { name: /Por persona/ }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar persona" }));
    expect(screen.getByRole("dialog", { name: "Agregar persona" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Crear cuenta de cliente" }));
    expect(props.onCreateCustomerAccount).toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "Agregar persona" })).not.toBeInTheDocument();
  });

  it("shows account products and payment actions without a separate review step", () => {
    const props = renderView({ accounts: [ACCOUNT], allocationDraft: { accountId: "account-a", lineItemId: "", quantity: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Ver cuenta" }));
    const account = screen.getByRole("article", { name: "Saldo de cuenta de Juan P." });
    expect(account).toHaveTextContent("KUTANA Pilsener 500ml");
    fireEvent.click(within(account).getByRole("button", { name: /Cobrar/ }));
    fireEvent.click(within(account).getByRole("button", { name: "Dejar pendiente" }));
    fireEvent.click(within(account).getByRole("button", { name: /Quitar KUTANA/ }));
    expect(props.onPayAccount).toHaveBeenCalledWith("account-a");
    expect(props.onMarkPending).toHaveBeenCalledWith("account-a");
    expect(props.onRemoveAllocation).toHaveBeenCalledWith("account-a", ["allocation-a"]);
  });

  it("marks paid account tabs and prevents editing their products", () => {
    renderView({ accounts: [{ ...ACCOUNT, status: "paid", paidCents: 392, remainingCents: 0 }] });
    expect(screen.getByRole("tab", { name: "Seleccionar cuenta Juan P." })).toHaveTextContent("✓ Juan P.");
    expect(screen.getByRole("button", { name: /Quitar KUTANA/ })).toBeDisabled();
  });

  it("calculates exact equal shares and routes amount payments to checkout", () => {
    const onPayOrder = vi.fn();
    renderView({ tableTotalCents: 1000, tableRemainingCents: 1000, onPayOrder });
    fireEvent.click(screen.getByRole("button", { name: /Partes iguales/ }));
    expect(screen.getByRole("region", { name: "División en partes iguales" })).toHaveTextContent("$5.00");
    fireEvent.click(screen.getByRole("button", { name: /Comenzar cobro/ }));
    expect(onPayOrder).toHaveBeenCalled();
  });
});
