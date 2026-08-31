import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App.js";
import { PortsProvider } from "./composition/PortsProvider.js";
import { buildMockPorts } from "./composition/mock.js";

describe("App", () => {
  it("renders the login gate first, then opens the KUTANA POS workspace", () => {
    render(
      <PortsProvider value={buildMockPorts()}>
        <App />
      </PortsProvider>,
    );

    expect(screen.getByRole("heading", { name: "Operator login" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Operator"), { target: { value: "Mina" } });
    fireEvent.change(screen.getByLabelText("PIN"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("img", { name: "KUTANA" })).toHaveAttribute("src", "/LOGOkutana.svg");
    expect(screen.getByRole("button", { name: "Inventory" })).toBeInTheDocument();
  });
});
