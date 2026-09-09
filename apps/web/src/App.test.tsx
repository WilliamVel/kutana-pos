import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createProduct } from "@kutana/shared/catalog/model/product.js";
import { App } from "./App.js";
import { PortsProvider } from "./composition/PortsProvider.js";
import { buildMockPorts } from "./composition/mock.js";

describe("App", () => {
  it("renders the login gate first, then opens the KUTANA POS workspace", async () => {
    render(
      <PortsProvider value={buildMockPorts()}>
        <App />
      </PortsProvider>,
    );

    expect(screen.getByRole("heading", { name: "Ingreso de operador" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Operador"), { target: { value: "Mina" } });
    fireEvent.change(screen.getByLabelText("PIN"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Inventario" })).toBeInTheDocument(),
    );
    expect(screen.getByRole("img", { name: "KUTANA" })).toHaveAttribute("src", "/LOGOkutana.svg");
    expect(screen.getByRole("button", { name: "Inventario" })).toBeInTheDocument();
  });

  it("opens category management from the inventory actions", async () => {
    render(
      <PortsProvider value={buildMockPorts()}>
        <App />
      </PortsProvider>,
    );

    fireEvent.change(screen.getByLabelText("Operador"), { target: { value: "Mina" } });
    fireEvent.change(screen.getByLabelText("PIN"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Agregar producto" })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Categorías" }));

    expect(screen.getByRole("heading", { name: "Categorías" })).toBeInTheDocument();
    expect(await screen.findByRole("form", { name: "Editar Draft Beer" })).toBeInTheDocument();
  });

  it("opens customer management from the top bar", async () => {
    render(
      <PortsProvider value={buildMockPorts()}>
        <App />
      </PortsProvider>,
    );

    fireEvent.change(screen.getByLabelText("Operador"), { target: { value: "Mina" } });
    fireEvent.change(screen.getByLabelText("PIN"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Clientes" })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Clientes" }));

    expect(screen.getByRole("heading", { name: "Clientes" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Formulario de cliente" })).toBeInTheDocument();
  });

  it("edits an existing product from the inventory screen", async () => {
    const ports = buildMockPorts();
    await ports.products.save(
      createProduct({
        id: "product-editable-app",
        name: "Blonde Ale 330ml",
        categoryId: "category-draft-beer",
        sku: "MENU-BLONDE-ALE-330",
        priceCents: 300,
        taxRateBp: 1200,
        stockKind: "volume",
        pourSizeMl: 330,
      }),
      0,
    );

    render(
      <PortsProvider value={ports}>
        <App />
      </PortsProvider>,
    );

    fireEvent.change(screen.getByLabelText("Operador"), { target: { value: "Mina" } });
    fireEvent.change(screen.getByLabelText("PIN"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));

    await waitFor(() => expect(screen.getByText("Blonde Ale 330ml")).toBeInTheDocument());
    const row = screen.getByRole("row", {
      name: /Blonde Ale 330ml MENU-BLONDE-ALE-330 Draft Beer/,
    });
    fireEvent.click(within(row).getByRole("button", { name: "Editar" }));

    await waitFor(() => expect(screen.getByDisplayValue("Blonde Ale 330ml")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "Blonde Ale 330ml Editada" },
    });
    fireEvent.change(screen.getByLabelText("Precio de venta (USD)"), { target: { value: "3.25" } });
    fireEvent.submit(screen.getByRole("form"));

    await waitFor(() => expect(screen.getByText("Blonde Ale 330ml Editada")).toBeInTheDocument());
    expect(screen.getByText("$3.25")).toBeInTheDocument();
  });

  it("logs out from the account menu", async () => {
    render(
      <PortsProvider value={buildMockPorts()}>
        <App />
      </PortsProvider>,
    );

    fireEvent.change(screen.getByLabelText("Operador"), { target: { value: "Mina" } });
    fireEvent.change(screen.getByLabelText("PIN"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Cuenta\s+Operador/ })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /Cuenta\s+Operador/ }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(screen.getByRole("heading", { name: "Ingreso de operador" })).toBeInTheDocument();
  });
});
