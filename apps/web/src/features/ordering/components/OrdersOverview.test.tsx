import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrdersOverview, type OrdersOverviewRow } from "./OrdersOverview.js";

const ROWS: OrdersOverviewRow[] = [
  {
    tableId: "table-1",
    tableLabel: "Table 1",
    status: "active",
    itemCount: 2,
    totalCents: 1350,
    openedAt: "2026-08-30T12:00:00.000Z",
  },
  {
    tableId: "table-2",
    tableLabel: "Table 2",
    status: "needs-check",
    itemCount: 4,
    totalCents: 2200,
    openedAt: "2026-08-30T11:30:00.000Z",
  },
];

describe("OrdersOverview", () => {
  it("does not present an empty state during the initial load", () => {
    render(
      <OrdersOverview
        rows={[]}
        loadState="initial-loading"
        selectedTableId={null}
        onSelectTable={vi.fn()}
      />,
    );

    expect(screen.queryByText("No hay órdenes abiertas.")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Cargando órdenes…");
  });

  it("lists each table's order with status, item count, and formatted total", () => {
    render(<OrdersOverview rows={ROWS} selectedTableId={null} onSelectTable={vi.fn()} />);

    expect(screen.getByText("Table 1")).toBeInTheDocument();
    expect(screen.getByText("2 productos")).toBeInTheDocument();
    expect(screen.getByText("$13.50")).toBeInTheDocument();
    expect(screen.getByText("Table 2")).toBeInTheDocument();
    expect(screen.getByText("4 productos")).toBeInTheDocument();
    expect(screen.getByText("$22.00")).toBeInTheDocument();
  });

  it("calls onSelectTable when a row is clicked", () => {
    const onSelectTable = vi.fn();
    render(<OrdersOverview rows={ROWS} selectedTableId={null} onSelectTable={onSelectTable} />);

    fireEvent.click(screen.getByRole("button", { name: /Table 2/ }));

    expect(onSelectTable).toHaveBeenCalledWith("table-2");
  });

  it("marks the currently selected table row", () => {
    render(<OrdersOverview rows={ROWS} selectedTableId="table-1" onSelectTable={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Table 1/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Table 2/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("preserves long labels for assistive technology and the hover tooltip", () => {
    const longLabel = "cliente@dominio-muy-largo.example/" + "x".repeat(60);
    render(
      <OrdersOverview
        rows={[{ ...ROWS[0]!, tableId: "long-label", tableLabel: longLabel }]}
        selectedTableId="long-label"
        onSelectTable={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: new RegExp(longLabel) })).not.toHaveAttribute("title");
    expect(screen.getByText(longLabel)).toHaveAttribute("aria-label", longLabel);
  });

  it("shows an empty state when there are no open orders", () => {
    render(<OrdersOverview rows={[]} selectedTableId={null} onSelectTable={vi.fn()} />);
    expect(screen.getByText("No hay órdenes abiertas.")).toBeInTheDocument();
  });
});
