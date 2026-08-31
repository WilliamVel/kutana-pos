import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SplitBillView, type AccountAssignmentAccount, type AccountAssignmentLine } from "./SplitBillView.js";

const LINE: AccountAssignmentLine = {
  id: "line-a",
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
    customers: [{ id: "customer-1", displayName: "Ada", phone: null, email: null, notes: null, createdAt: "now", updatedAt: "now" }],
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
    onAttemptClose: vi.fn(),
    ...overrides,
  };
  render(<SplitBillView {...props} />);
  return props;
}

describe("SplitBillView", () => {
  it("renders account assignment instead of two anonymous bills", () => {
    renderView();

    expect(screen.getByRole("heading", { name: "Table 1 — Personal accounts" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Unassigned quantities" })).toHaveTextContent("1 unassigned");
    expect(screen.getByRole("article", { name: "Account for Juan P." })).toHaveTextContent("remaining");
  });

  it("exposes customer, free-name, quantity assignment, payment, pending, and review actions", () => {
    const props = renderView({
      selectedCustomerId: "customer-1",
      freeName: "Mesa amiga",
      allocationDraft: { accountId: "account-a", lineItemId: "line-a", quantity: "1" },
    });

    fireEvent.change(screen.getByLabelText("Existing customer"), { target: { value: "customer-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Create customer account" }));
    fireEvent.change(screen.getByLabelText("Free-name account"), { target: { value: "Mesa amiga 2" } });
    fireEvent.click(screen.getByRole("button", { name: "Create free-name account" }));
    fireEvent.click(screen.getByRole("button", { name: "Assign quantity" }));
    fireEvent.click(screen.getByRole("button", { name: "Pay now" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark pending" }));
    fireEvent.click(screen.getByRole("button", { name: "Review table closure" }));

    expect(props.onSelectCustomer).toHaveBeenCalledWith("customer-1");
    expect(props.onFreeNameChange).toHaveBeenCalledWith("Mesa amiga 2");
    expect(props.onCreateCustomerAccount).toHaveBeenCalled();
    expect(props.onCreateFreeNameAccount).toHaveBeenCalled();
    expect(props.onAssignQuantity).toHaveBeenCalled();
    expect(props.onPayAccount).toHaveBeenCalledWith("account-a");
    expect(props.onMarkPending).toHaveBeenCalledWith("account-a");
    expect(props.onAttemptClose).toHaveBeenCalled();
  });

  it("shows review state feedback for unresolved table closure", () => {
    renderView({ reviewMessage: "Review required: 1 line item has unassigned quantities." });

    expect(screen.getByRole("alert")).toHaveTextContent(/review required/i);
  });
});
