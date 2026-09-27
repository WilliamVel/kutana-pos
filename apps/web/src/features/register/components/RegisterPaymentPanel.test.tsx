import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RegisterPaymentPanel, type RegisterPaymentMethodOption } from "./RegisterPaymentPanel.js";

const METHODS: RegisterPaymentMethodOption[] = [
  { code: "CASH", label: "Efectivo", requiresTendered: true },
  { code: "BANK_TRANSFER", label: "Transferencia bancaria", requiresTendered: false },
  { code: "QR_PAYMENT", label: "Pago QR", requiresTendered: false },
];

function renderPanel(overrides: Partial<React.ComponentProps<typeof RegisterPaymentPanel>> = {}) {
  const props: React.ComponentProps<typeof RegisterPaymentPanel> = {
    lines: [
      {
        id: "line-1",
        name: "KUTANA Pilsener 500ml",
        quantity: 2,
        unitPriceCents: 350,
        totalCents: 784,
        pourSizeMl: 500,
        isAdjustment: false,
      },
    ],
    subtotalCents: 700,
    taxCents: 84,
    totalCents: 784,
    remainingBalanceCents: 784,
    amountToPayCents: 784,
    onAmountToPayChange: vi.fn(),
    methods: METHODS,
    selectedMethodCode: "CASH",
    onSelectMethod: vi.fn(),
    tenderedCents: null,
    onTenderedChange: vi.fn(),
    changeDueCents: null,
    onConfirmPayment: vi.fn(),
    canConfirm: false,
    ...overrides,
  };
  render(<RegisterPaymentPanel {...props} />);
  return props;
}

describe("RegisterPaymentPanel", () => {
  it("lists every method from the registry — CASH, BANK_TRANSFER, QR_PAYMENT — and never a card option", () => {
    renderPanel();

    expect(screen.getByRole("radio", { name: "Efectivo" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Transferencia bancaria" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Pago QR" })).toBeInTheDocument();
    expect(screen.queryByText(/card/i)).not.toBeInTheDocument();
  });

  it("shows the tendered-amount input only for a method whose registry entry requires it", () => {
    renderPanel({ selectedMethodCode: "CASH" });
    expect(screen.getByLabelText("Efectivo recibido")).toBeInTheDocument();

    renderPanel({ selectedMethodCode: "BANK_TRANSFER" });
    expect(screen.queryAllByLabelText("Efectivo recibido")).toHaveLength(1); // still just the CASH render above
  });

  it("does not show tendered input when the selected method does not require it", () => {
    render(
      <RegisterPaymentPanel
        lines={[]}
        subtotalCents={0}
        taxCents={0}
        totalCents={784}
        remainingBalanceCents={784}
        amountToPayCents={784}
        onAmountToPayChange={vi.fn()}
        methods={METHODS}
        selectedMethodCode="QR_PAYMENT"
        onSelectMethod={vi.fn()}
        tenderedCents={null}
        onTenderedChange={vi.fn()}
        changeDueCents={null}
        onConfirmPayment={vi.fn()}
        canConfirm
      />,
    );
    expect(screen.queryByLabelText("Efectivo recibido")).not.toBeInTheDocument();
  });

  it("displays the computed change due when provided", () => {
    renderPanel({ tenderedCents: 1000, changeDueCents: 216 });
    expect(screen.getByText("$2.16")).toBeInTheDocument();
  });

  it("calls onSelectMethod when a different method is chosen", () => {
    const onSelectMethod = vi.fn();
    renderPanel({ onSelectMethod });
    fireEvent.click(screen.getByRole("radio", { name: "Pago QR" }));
    expect(onSelectMethod).toHaveBeenCalledWith("QR_PAYMENT");
  });

  it("calls onTenderedChange as the cashier types the tendered amount", () => {
    const onTenderedChange = vi.fn();
    renderPanel({ onTenderedChange });
    fireEvent.change(screen.getByLabelText("Efectivo recibido"), { target: { value: "10.00" } });
    expect(onTenderedChange).toHaveBeenCalledWith(1000);
  });

  it("disables the confirm-payment button until canConfirm is true", () => {
    renderPanel({ canConfirm: false });
    expect(screen.getByRole("button", { name: /Cobrar ·/ })).toBeDisabled();
  });

  it("calls onConfirmPayment when confirm is pressed and enabled", () => {
    const onConfirmPayment = vi.fn();
    renderPanel({ canConfirm: true, onConfirmPayment });
    fireEvent.click(screen.getByRole("button", { name: /Cobrar ·/ }));
    expect(onConfirmPayment).toHaveBeenCalledOnce();
  });

  it("lets the cashier enter a partial amount to pay now, distinct from the full remaining balance", () => {
    const onAmountToPayChange = vi.fn();
    renderPanel({ remainingBalanceCents: 1500, amountToPayCents: 1500, onAmountToPayChange });

    fireEvent.change(screen.getByLabelText("Monto a cobrar"), { target: { value: "10.00" } });

    expect(onAmountToPayChange).toHaveBeenCalledWith(1000);
  });

  it("omits the tax row for a zero-tax order and charges its listed total", () => {
    renderPanel({
      lines: [{
        id: "line-zero-tax",
        name: "KUTANA Pilsener 500ml",
        quantity: 2,
        unitPriceCents: 350,
        totalCents: 700,
        pourSizeMl: 500,
        isAdjustment: false,
      }],
      subtotalCents: 700,
      taxCents: 0,
      totalCents: 700,
      remainingBalanceCents: 700,
      amountToPayCents: 700,
    });

    expect(screen.queryByText("Impuestos")).not.toBeInTheDocument();
    expect(screen.getAllByText("$7.00").length).toBeGreaterThanOrEqual(2);
  });

  it("shows product count, keeps checkout lines read-only, and blocks unresolved products", () => {
    renderPanel({ productsError: "No se pudieron resolver los productos." });
    expect(screen.getByText(/2 unidades · 1 producto/)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron resolver los productos.");
    expect(screen.queryByRole("button", { name: /Eliminar/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cobrar ·/ })).toBeDisabled();
  });

  it("shows the remaining balance so partial payments toward one ticket are visible", () => {
    renderPanel({ remainingBalanceCents: 500 });
    expect(screen.getByText("$5.00")).toBeInTheDocument();
  });
});
