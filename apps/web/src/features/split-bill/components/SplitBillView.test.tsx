import { fireEvent, render, screen, within } from "@testing-library/react";
import { Profiler } from "react";
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
  assignedLines: [
    {
      allocationIds: ["allocation-a"],
      name: "KUTANA Pilsener 500ml",
      quantity: 1,
      totalCents: 392,
    },
  ],
};

function renderView(overrides: Partial<React.ComponentProps<typeof SplitBillView>> = {}) {
  const props: React.ComponentProps<typeof SplitBillView> = {
    tableLabel: "Table 1",
    tableTotalCents: 784,
    tableRemainingCents: 784,
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
  it("does not commit an extra render when derived lines keep the same data", () => {
    const commits: string[] = [];
    const props: React.ComponentProps<typeof SplitBillView> = {
      tableLabel: "Table 1",
      tableTotalCents: 784,
      tableRemainingCents: 784,
      customers: [],
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
      onAttemptClose: vi.fn(),
      onPayOrder: vi.fn(),
    };
    const view = render(
      <Profiler id="split-bill" onRender={() => commits.push("commit")}>
        <SplitBillView {...props} />
      </Profiler>,
    );

    commits.length = 0;
    view.rerender(
      <Profiler id="split-bill" onRender={() => commits.push("commit")}>
        <SplitBillView {...props} lines={[...props.lines]} />
      </Profiler>,
    );

    expect(commits).toHaveLength(1);
  });

  it("starts with a compact split-method choice and persistent total", () => {
    renderView();
    expect(
      screen.getByRole("heading", { name: "¿Cómo quieres dividir la cuenta?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Por persona/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Partes iguales/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Por monto/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Resumen de la mesa")).toHaveTextContent("Saldo pendiente$7.84");
  });

  it("orders unassigned products with the same category sections as the order ticket", () => {
    const lines: AccountAssignmentLine[] = [
      {
        ...LINE,
        id: "food-line",
        lineItemIds: ["food-line"],
        productId: "food",
        pourSizeMl: null,
        categoryName: "Food",
        stockKind: "unit",
        name: "Loaded Nachos",
      },
      {
        ...LINE,
        id: "beer-500-line",
        lineItemIds: ["beer-500-line"],
        productId: "beer-500",
        pourSizeMl: 500,
        categoryName: "Draft Beer",
        stockKind: "volume",
        name: "Pilsener 500ml",
      },
      {
        ...LINE,
        id: "beer-330-line",
        lineItemIds: ["beer-330-line"],
        productId: "beer-330",
        pourSizeMl: 330,
        categoryName: "Draft Beer",
        stockKind: "volume",
        name: "Pilsener 330ml",
      },
    ];
    renderView({ lines, accounts: [ACCOUNT] });
    fireEvent.click(screen.getByRole("tab", { name: /Sin asignar/ }));

    const pending = screen.getByRole("region", { name: "Productos pendientes" });
    expect(
      within(pending)
        .getAllByRole("heading", { level: 4 })
        .map((heading) => heading.textContent),
    ).toEqual(["Bebidas", "Comida"]);
    expect(
      within(pending)
        .getAllByRole("article")
        .map((article) => article.textContent),
    ).toEqual([
      expect.stringContaining("Pilsener 330ml"),
      expect.stringContaining("Pilsener 500ml"),
      expect.stringContaining("Loaded Nachos"),
    ]);
  });

  it("labels zero-tax assigned lines as importe total while preserving historical tax labels", () => {
    renderView({
      accounts: [ACCOUNT],
      allocationDraft: { accountId: "account-a", lineItemId: "line-a", quantity: "1" },
    });

    expect(screen.getAllByText("Importe total").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("Total (incl. impuestos)")).not.toBeInTheDocument();

    renderView({
      accounts: [
        {
          ...ACCOUNT,
          id: "account-taxed",
          assignedLines: [{ ...ACCOUNT.assignedLines![0]!, taxRateBp: 1200 }],
        },
      ],
      allocationDraft: { accountId: "account-taxed", lineItemId: "line-a", quantity: "1" },
    });
    expect(screen.getAllByText("Total (incl. impuestos)").length).toBeGreaterThanOrEqual(2);
  });

  it("uses account tabs as navigation and assigns compact row quantities", () => {
    const props = renderView({
      accounts: [ACCOUNT],
      allocationDraft: { accountId: "account-a", lineItemId: "line-a", quantity: "1" },
    });
    fireEvent.click(screen.getByRole("tab", { name: /Sin asignar/ }));
    const row = screen.getByRole("article", { name: "Asignar KUTANA Pilsener 500ml" });
    expect(
      within(row).queryByLabelText("Cantidad para KUTANA Pilsener 500ml"),
    ).not.toBeInTheDocument();
    fireEvent.click(within(row).getByRole("button", { name: "Asignar" }));
    expect(props.onAssignQuantity).toHaveBeenCalledWith({
      accountId: "account-a",
      lineItemId: "line-a",
      quantity: "1",
    });
  });

  it("reports only unassigned product value in the account summary", () => {
    renderView({
      accounts: [ACCOUNT],
      allocationDraft: { accountId: "account-a", lineItemId: "", quantity: "1" },
    });

    const summary = screen.getByLabelText("Resumen de la mesa");
    expect(within(summary).getByText("Sin asignar").parentElement).toHaveTextContent("$3.92");
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

    fireEvent.click(screen.getByRole("tab", { name: /Sin asignar/ }));
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
    renderView({
      accounts: [ACCOUNT],
      allocationDraft: { accountId: "account-a", lineItemId: "", quantity: "1" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Partes iguales" }));
    expect(confirm).toHaveBeenCalled();
    expect(
      screen.queryByRole("region", { name: "División en partes iguales" }),
    ).not.toBeInTheDocument();

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
    const props = renderView({
      accounts: [ACCOUNT],
      allocationDraft: { accountId: "account-a", lineItemId: "", quantity: "1" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "Productos de Juan P." }));
    const account = screen.getByRole("article", { name: "Saldo de cuenta de Juan P." });
    expect(account).toHaveTextContent("KUTANA Pilsener 500ml");
    expect(within(account).getByRole("button", { name: "Cobrar · $3.92" })).toBeEnabled();
    fireEvent.click(within(account).getByRole("button", { name: /Cobrar/ }));
    fireEvent.click(within(account).getByRole("button", { name: "Dejar pendiente" }));
    fireEvent.click(within(account).getByRole("button", { name: /Devolver KUTANA/ }));
    expect(props.onPayAccount).toHaveBeenCalledWith("account-a");
    expect(props.onMarkPending).toHaveBeenCalledWith("account-a");
    expect(props.onRemoveAllocation).toHaveBeenCalledWith("account-a", ["allocation-a"], 1);
  });

  it("hides assigned products for a paid account while preserving account totals", () => {
    renderView({
      accounts: [{ ...ACCOUNT, status: "paid", paidCents: 392, remainingCents: 0 }],
      allocationDraft: { accountId: "account-a", lineItemId: "", quantity: "1" },
    });

    fireEvent.click(screen.getByRole("tab", { name: "Productos de Juan P." }));
    expect(
      screen.getByText("Esta cuenta está pagada; sus productos asignados ya no se muestran."),
    ).toBeInTheDocument();
    expect(screen.queryByText("KUTANA Pilsener 500ml")).not.toBeInTheDocument();
    expect(screen.getByText("Restante").parentElement).toHaveTextContent("$0.00");
  });

  it("keeps assigned products visible for a partially paid account", () => {
    renderView({
      accounts: [{ ...ACCOUNT, status: "partially_paid", paidCents: 100, remainingCents: 292 }],
      allocationDraft: { accountId: "account-a", lineItemId: "", quantity: "1" },
    });

    fireEvent.click(screen.getByRole("tab", { name: "Productos de Juan P." }));
    expect(screen.getByText("KUTANA Pilsener 500ml")).toBeInTheDocument();
  });

  it("marks paid account tabs and prevents editing their products", () => {
    renderView({ accounts: [{ ...ACCOUNT, status: "paid", paidCents: 392, remainingCents: 0 }] });
    expect(screen.getByRole("tab", { name: "Seleccionar cuenta Juan P." })).toHaveTextContent(
      "✓ Juan P.",
    );
    expect(screen.queryByRole("button", { name: /Devolver KUTANA/ })).not.toBeInTheDocument();
  });

  it("confirms removing an empty person and calls the deletion action", () => {
    const onDeleteAccount = vi.fn();
    renderView({
      accounts: [{ ...ACCOUNT, assignedLines: [], totalCents: 0, remainingCents: 0 }],
      onDeleteAccount,
    });

    fireEvent.click(screen.getByRole("button", { name: "Acciones para Juan P." }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar persona" }));
    expect(onDeleteAccount).toHaveBeenCalledWith("account-a");
  });

  it("confirms removing assigned products with units and value", () => {
    const onDeleteAccount = vi.fn();
    renderView({ accounts: [ACCOUNT], onDeleteAccount });

    fireEvent.click(screen.getByRole("button", { name: "Acciones para Juan P." }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar persona" }));
    expect(
      screen.getByRole("dialog", { name: "Juan P.: tiene productos asignados" }),
    ).toHaveTextContent("1 unidad(es)");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onDeleteAccount).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Acciones para Juan P." }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar persona" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar y devolver productos" }));
    expect(onDeleteAccount).toHaveBeenCalledWith("account-a");
  });

  it("does not delete an account with payment history", () => {
    const onDeleteAccount = vi.fn();
    renderView({
      accounts: [
        {
          ...ACCOUNT,
          payments: [
            { id: "payment-a", amountCents: 392, methodLabel: "Efectivo", recordedAt: "now" },
          ],
          paidCents: 392,
          remainingCents: 0,
          status: "paid",
        },
      ],
      onDeleteAccount,
    });
    fireEvent.click(screen.getByRole("button", { name: "Acciones para Juan P." }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar persona" }));
    expect(onDeleteAccount).not.toHaveBeenCalled();
  });

  it("offers assignment from an empty account and disables charging at zero", () => {
    const onAllocationDraftChange = vi.fn();
    renderView({
      accounts: [{ ...ACCOUNT, assignedLines: [], totalCents: 0, remainingCents: 0 }],
      lines: [],
      onAllocationDraftChange,
    });
    expect(screen.getByText("Esta persona todavía no tiene productos.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "+ Agregar productos a Juan P." }));
    expect(onAllocationDraftChange).toHaveBeenCalledWith({
      accountId: "account-a",
      lineItemId: "",
      quantity: "1",
    });
    expect(screen.getByRole("button", { name: "Cuenta pagada" })).toBeDisabled();
  });

  it("keeps quantity drafts editable while retaining the raw callback value", () => {
    const onAllocationDraftChange = vi.fn();
    renderView({
      accounts: [ACCOUNT],
      lines: [{ ...LINE, quantity: 12, unassignedQuantity: 12 }],
      allocationDraft: { accountId: "account-a", lineItemId: "line-a", quantity: "1" },
      onAllocationDraftChange,
    });
    fireEvent.click(screen.getByRole("tab", { name: /Sin asignar/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar KUTANA Pilsener 500ml" }));
    const quantity = screen.getByLabelText("Cantidad para KUTANA Pilsener 500ml");
    fireEvent.change(quantity, { target: { value: "" } });
    expect((quantity as HTMLInputElement).value).toBe("");
    fireEvent.change(quantity, { target: { value: "12" } });
    expect((quantity as HTMLInputElement).value).toBe("12");
    expect(onAllocationDraftChange).toHaveBeenLastCalledWith({
      accountId: "account-a",
      lineItemId: "line-a",
      quantity: "12",
    });
  });

  it("commits a bounded quantity while preserving an empty draft until assignment", () => {
    const onAssignQuantity = vi.fn();
    renderView({
      accounts: [ACCOUNT],
      lines: [{ ...LINE, quantity: 5, unassignedQuantity: 2 }],
      allocationDraft: { accountId: "account-a", lineItemId: "line-a", quantity: "1" },
      onAssignQuantity,
    });
    fireEvent.click(screen.getByRole("tab", { name: /Sin asignar/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar KUTANA Pilsener 500ml" }));
    const quantity = screen.getByLabelText("Cantidad para KUTANA Pilsener 500ml");
    fireEvent.change(quantity, { target: { value: "" } });
    expect((quantity as HTMLInputElement).value).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Asignar" }));
    expect(onAssignQuantity).toHaveBeenCalledWith({
      accountId: "account-a",
      lineItemId: "line-a",
      quantity: "1",
    });
  });

  it("counts selected units and includes the line total per selected quantity", () => {
    const line = { ...LINE, quantity: 5, totalCents: 1960, unassignedQuantity: 5 };
    renderView({
      accounts: [ACCOUNT],
      lines: [line],
      allocationDraft: { accountId: "account-a", lineItemId: "", quantity: "1" },
    });
    fireEvent.click(screen.getByRole("tab", { name: /Sin asignar/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar KUTANA Pilsener 500ml" }));
    fireEvent.click(screen.getByRole("button", { name: "Aumentar KUTANA Pilsener 500ml" }));
    expect(screen.getByRole("region", { name: "Asignación múltiple" })).toHaveTextContent(
      "2 unidades · 1 producto · $7.84",
    );
  });

  it("offers partial or total return for a product with multiple units", () => {
    const onRemoveAllocation = vi.fn().mockResolvedValue(true);
    renderView({
      accounts: [{ ...ACCOUNT, assignedLines: [{ ...ACCOUNT.assignedLines![0]!, quantity: 3 }] }],
      onRemoveAllocation,
    });
    fireEvent.click(screen.getByRole("button", { name: /Devolver KUTANA/ }));
    expect(screen.getByRole("dialog", { name: /Cantidad a devolver/ })).toHaveTextContent(
      "3 unidades asignadas",
    );
    fireEvent.click(screen.getByRole("button", { name: "Devolver 1 unidad" }));
    expect(onRemoveAllocation).toHaveBeenCalledWith("account-a", ["allocation-a"], 1);
  });

  it("calculates exact equal shares and routes amount payments to checkout", () => {
    const onPayOrder = vi.fn();
    renderView({ tableTotalCents: 1000, tableRemainingCents: 1000, onPayOrder });
    fireEvent.click(screen.getByRole("button", { name: /Partes iguales/ }));
    expect(screen.getByRole("region", { name: "División en partes iguales" })).toHaveTextContent(
      "$5.00",
    );
    fireEvent.click(screen.getByRole("button", { name: /Comenzar cobro/ }));
    expect(onPayOrder).toHaveBeenCalled();
  });
});
