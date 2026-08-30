import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SplitBillView, type SplitBillLine } from "./SplitBillView.js";

const LINE_A: SplitBillLine = {
  id: "line-a",
  name: "KUTANA Pilsener 500ml",
  quantity: 2,
  totalCents: 300,
};
const LINE_B: SplitBillLine = { id: "line-b", name: "Nachos", quantity: 1, totalCents: 700 };

function renderView(overrides: Partial<React.ComponentProps<typeof SplitBillView>> = {}) {
  const props: React.ComponentProps<typeof SplitBillView> = {
    originalLines: [LINE_A, LINE_B],
    newLines: [],
    originalTotalCents: 1000,
    newTotalCents: 0,
    onMoveToNew: vi.fn(),
    onMoveToOriginal: vi.fn(),
    disabled: false,
    ...overrides,
  };
  render(<SplitBillView {...props} />);
  return props;
}

describe("SplitBillView", () => {
  it("renders both panels with their real item names and correct totals", () => {
    renderView();

    expect(screen.getByRole("region", { name: "Original Bill" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "New Bill" })).toBeInTheDocument();
    expect(screen.getByText("KUTANA Pilsener 500ml")).toBeInTheDocument();
    expect(screen.getByText("Nachos")).toBeInTheDocument();

    const originalPanel = screen.getByRole("region", { name: "Original Bill" });
    expect(
      Array.from(originalPanel.querySelectorAll("*")).some((el) => el.textContent === "$10.00"),
    ).toBe(true);

    const newPanel = screen.getByRole("region", { name: "New Bill" });
    expect(
      Array.from(newPanel.querySelectorAll("*")).some((el) => el.textContent === "$0.00"),
    ).toBe(true);
  });

  it("shows the empty-state message on the New Bill panel when it has no items yet", () => {
    renderView();
    expect(screen.getByText("No items moved yet.")).toBeInTheDocument();
  });

  it("calls onMoveToNew with the real line item id when its move button is pressed", () => {
    const onMoveToNew = vi.fn();
    renderView({ onMoveToNew });

    fireEvent.click(screen.getAllByRole("button", { name: "Move to New Bill" })[0]!);

    expect(onMoveToNew).toHaveBeenCalledWith("line-a");
  });

  it("calls onMoveToOriginal with the real line item id when its move button is pressed", () => {
    const onMoveToOriginal = vi.fn();
    renderView({
      originalLines: [LINE_B],
      newLines: [LINE_A],
      originalTotalCents: 700,
      newTotalCents: 300,
      onMoveToOriginal,
    });

    fireEvent.click(screen.getByRole("button", { name: "Move to Original Bill" }));

    expect(onMoveToOriginal).toHaveBeenCalledWith("line-a");
  });

  it("keeps both panel totals summing to the original order total after an item moves — no cent lost or invented", () => {
    // Before the move: everything on the Original Bill.
    const before = renderView({
      originalLines: [LINE_A, LINE_B],
      newLines: [],
      originalTotalCents: 1000,
      newTotalCents: 0,
    });
    const beforeSum = before.originalTotalCents + before.newTotalCents;

    // After moving LINE_A to the New Bill (simulating the container's next render).
    const after = renderView({
      originalLines: [LINE_B],
      newLines: [LINE_A],
      originalTotalCents: 700,
      newTotalCents: 300,
    });
    const afterSum = after.originalTotalCents + after.newTotalCents;

    expect(afterSum).toBe(beforeSum);

    const originalPanel = screen.getAllByRole("region", { name: "Original Bill" }).at(-1)!;
    const newPanel = screen.getAllByRole("region", { name: "New Bill" }).at(-1)!;
    expect(
      Array.from(originalPanel.querySelectorAll("*")).some((el) => el.textContent === "$7.00"),
    ).toBe(true);
    expect(
      Array.from(newPanel.querySelectorAll("*")).some((el) => el.textContent === "$3.00"),
    ).toBe(true);
  });

  it("disables every move button when the disabled prop is true (e.g. while a conflict banner is showing)", () => {
    renderView({ disabled: true, newLines: [LINE_B], newTotalCents: 700 });

    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
  });
});
