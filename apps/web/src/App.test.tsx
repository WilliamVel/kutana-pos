import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App.js";
import { PortsProvider } from "./composition/PortsProvider.js";
import { buildMockPorts } from "./composition/mock.js";

describe("App", () => {
  it("renders the KUTANA POS heading, proving Vitest + Testing Library run in this workspace", () => {
    render(
      <PortsProvider value={buildMockPorts()}>
        <App />
      </PortsProvider>,
    );
    expect(screen.getByRole("heading", { name: "KUTANA POS" })).toBeInTheDocument();
  });
});
