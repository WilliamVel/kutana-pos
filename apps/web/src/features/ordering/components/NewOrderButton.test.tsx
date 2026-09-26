import { fireEvent, render, screen, within } from "@testing-library/react";
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

    fireEvent.click(screen.getByRole("button", { name: "Nueva orden" }));
    expect(screen.getByText("Table 4")).toBeInTheDocument();
    expect(screen.getByText("Table 5")).toBeInTheDocument();
  });

  it("calls onSelectTable with the chosen free table id", () => {
    const onSelectTable = vi.fn();
    render(<NewOrderButton freeTables={FREE} onSelectTable={onSelectTable} />);

    fireEvent.click(screen.getByRole("button", { name: "Nueva orden" }));
    fireEvent.click(screen.getByRole("button", { name: "Table 5" }));

    expect(onSelectTable).toHaveBeenCalledWith("table-5");
  });

  it("shows an empty note when no tables are free", () => {
    render(<NewOrderButton freeTables={[]} onSelectTable={vi.fn()} onCreateTable={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Nueva orden" }));
    expect(screen.getByText("No hay mesas libres ahora.")).toBeInTheDocument();
  });

  it("creates a table from a custom label", () => {
    const onCreateTable = vi.fn();
    render(<NewOrderButton freeTables={FREE} onSelectTable={vi.fn()} onCreateTable={onCreateTable} />);

    fireEvent.click(screen.getByRole("button", { name: "Nueva orden" }));
    fireEvent.change(screen.getByLabelText("Nombre o número"), { target: { value: "Barra" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear orden" }));

    expect(onCreateTable).toHaveBeenCalledWith("Barra");
  });

  it("explains when the table name already exists", async () => {
    const onCreateTable = vi.fn().mockRejectedValue({ status: 409 });
    render(<NewOrderButton freeTables={[]} onSelectTable={vi.fn()} onCreateTable={onCreateTable} />);

    fireEvent.click(screen.getByRole("button", { name: "Nueva orden" }));
    fireEvent.change(screen.getByLabelText("Nombre o número"), { target: { value: "Mesa 7" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear orden" }));

    const dialog = await screen.findByRole("alertdialog", { name: "Mesa duplicada" });
    expect(
      within(dialog).getByText("Ya existe una mesa con ese nombre o número. Prueba con otro."),
    ).toBeInTheDocument();
  });
});
