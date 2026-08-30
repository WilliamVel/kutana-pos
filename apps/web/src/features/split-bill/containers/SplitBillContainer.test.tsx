import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import { buildMockPorts } from "../../../composition/mock.js";
import { SplitBillContainer } from "./SplitBillContainer.js";

describe("SplitBillContainer", () => {
  it("starts with every line item on the Original Bill and an empty New Bill", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <SplitBillContainer tableId="table-1" />
      </PortsProvider>,
    );

    // Seeded order: 2x Pilsener 500ml (784) + 1 Nachos (728) = 1512 total.
    await waitFor(() =>
      expect(screen.getByRole("region", { name: "Original Bill" })).toHaveTextContent("$15.12"),
    );
    expect(screen.getByRole("region", { name: "New Bill" })).toHaveTextContent("$0.00");
    expect(screen.getByText("No items moved yet.")).toBeInTheDocument();
  });

  it("moves an item to the New Bill and conserves every cent across both totals", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <SplitBillContainer tableId="table-1" />
      </PortsProvider>,
    );

    await waitFor(() =>
      expect(screen.getByRole("region", { name: "Original Bill" })).toHaveTextContent("$15.12"),
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Move to New Bill" })[0]!);

    await waitFor(() =>
      expect(screen.getByRole("region", { name: "New Bill" })).not.toHaveTextContent(
        "No items moved yet.",
      ),
    );

    const originalPanel = screen.getByRole("region", { name: "Original Bill" });
    const newPanel = screen.getByRole("region", { name: "New Bill" });

    const originalCentsText = originalPanel.textContent ?? "";
    const newCentsText = newPanel.textContent ?? "";
    const originalDollars = Number(originalCentsText.match(/\$(\d+\.\d\d)\s*$/)?.[1] ?? "NaN");
    const newDollars = Number(newCentsText.match(/\$(\d+\.\d\d)\s*$/)?.[1] ?? "NaN");

    // Cent-conservation: no matter which item moved, both panel totals
    // must still sum to the exact original order total.
    expect(Math.round((originalDollars + newDollars) * 100)).toBe(1512);

    const order = await ports.orders.findByTable("table-1");
    const allTickets = await ports.tickets.listByOrder(order!.id);
    expect(allTickets).toHaveLength(2);
    const allAllocations = await ports.tickets.listAllocationsByOrder(order!.id);
    expect(allAllocations).toHaveLength(order!.lineItems.length);
  });

  it("shows a non-technical conflict banner on a forced conflict, refreshes data, and re-enables the move action", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <SplitBillContainer tableId="table-1" />
      </PortsProvider>,
    );

    await waitFor(() =>
      expect(screen.getByRole("region", { name: "Original Bill" })).toHaveTextContent("$15.12"),
    );

    fireEvent.click(screen.getByRole("button", { name: "Force conflict (demo)" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Move to New Bill" })[0]!);

    const banner = await screen.findByRole("alert");
    expect(banner.textContent).toMatch(/this bill changed/i);
    expect(banner.textContent).not.toMatch(/409|ConflictError|stack|Error:/i);

    // The move button must be disabled while the conflict is showing (re-enable happens on dismiss).
    expect(screen.getAllByRole("button", { name: "Move to New Bill" })[0]).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Got it — try again" }));

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Move to New Bill" })[0]).not.toBeDisabled(),
    );

    // The action works after the conflict is dismissed.
    fireEvent.click(screen.getAllByRole("button", { name: "Move to New Bill" })[0]!);
    await waitFor(() =>
      expect(screen.getByRole("region", { name: "New Bill" })).not.toHaveTextContent(
        "No items moved yet.",
      ),
    );
  });
});
