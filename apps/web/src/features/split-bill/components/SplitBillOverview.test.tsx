import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SplitBillOverview } from "./SplitBillOverview.js";

const totals = {
  tableLabel: "Mesa 1",
  tableTotalCents: 2500,
  assignedCents: 1500,
  unassignedCents: 600,
  tablePaidCents: 400,
  tableRemainingCents: 2100,
};

describe("SplitBillOverview", () => {
  it("shows the account balance and lets the operator choose the initial method", () => {
    const onChooseMethod = vi.fn();
    render(
      <SplitBillOverview
        {...totals}
        method={null}
        onChooseMethod={onChooseMethod}
        onChangeMethod={vi.fn()}
      />,
    );

    const summary = document.querySelector('dl[aria-label="Resumen de la mesa"]');
    expect(summary).not.toBeNull();
    expect(within(summary as HTMLElement).getByText("Asignado").parentElement).toHaveTextContent(
      "$15.00",
    );
    expect(within(summary as HTMLElement).getByText("Sin asignar").parentElement).toHaveTextContent(
      "$6.00",
    );
    expect(
      within(summary as HTMLElement).getByText("Saldo pendiente").parentElement,
    ).toHaveTextContent("$21.00");
    fireEvent.click(screen.getByRole("button", { name: /Por persona/ }));
    expect(onChooseMethod).toHaveBeenCalledWith("person");
  });

  it("delegates subsequent method changes to the parent's protected transition", () => {
    const onChangeMethod = vi.fn();
    render(
      <SplitBillOverview
        {...totals}
        method="person"
        onChooseMethod={vi.fn()}
        onChangeMethod={onChangeMethod}
      />,
    );

    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Método de división" })).getByRole("button", {
        name: "Partes iguales",
      }),
    );
    expect(onChangeMethod).toHaveBeenCalledWith("equal");
  });
});
