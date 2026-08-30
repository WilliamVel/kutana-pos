import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewOrderButton } from "./NewOrderButton.js";

const FREE = [
  { id: "table-4", label: "Table 4" },
  { id: "table-5", label: "Table 5" },
];

describe("NewOrderButton", () => {
  it("hides the free-table picker until the button is pressed", () => {
    render(<NewOrderButton freeTables={FREE} onSelectTable={vi.fn()} />);
    expect(screen.queryByText("Table 4")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New order" }));
    expect(screen.getByText("Table 4")).toBeInTheDocument();
    expect(screen.getByText("Table 5")).toBeInTheDocument();
  });

  it("calls onSelectTable with the chosen free table id", () => {
    const onSelectTable = vi.fn();
    render(<NewOrderButton freeTables={FREE} onSelectTable={onSelectTable} />);

    fireEvent.click(screen.getByRole("button", { name: "New order" }));
    fireEvent.click(screen.getByRole("button", { name: "Table 5" }));

    expect(onSelectTable).toHaveBeenCalledWith("table-5");
  });

  it("shows an empty note when no tables are free", () => {
    render(<NewOrderButton freeTables={[]} onSelectTable={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "New order" }));
    expect(screen.getByText("No free tables right now.")).toBeInTheDocument();
  });
});
