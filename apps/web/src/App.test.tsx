import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App.js";

describe("App", () => {
  it("renders the KUTANA POS heading, proving Vitest + Testing Library run in this workspace", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "KUTANA POS" })).toBeInTheDocument();
  });
});
