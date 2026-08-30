import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "./AppShell.js";

describe("AppShell", () => {
  it("renders the top bar, sidebar and children slots", () => {
    render(
      <AppShell topBar={<div>top-slot</div>} sidebar={<div>side-slot</div>}>
        <p>screen content</p>
      </AppShell>,
    );

    expect(screen.getByText("top-slot")).toBeInTheDocument();
    expect(screen.getByText("side-slot")).toBeInTheDocument();
    expect(screen.getByText("screen content")).toBeInTheDocument();
  });

  it("omits the action bar slot when no actionBar prop is given", () => {
    render(
      <AppShell topBar={<div>top</div>} sidebar={<div>side</div>}>
        <p>content</p>
      </AppShell>,
    );

    expect(screen.queryByText("action-slot")).not.toBeInTheDocument();
  });

  it("renders the action bar slot when provided", () => {
    render(
      <AppShell
        topBar={<div>top</div>}
        sidebar={<div>side</div>}
        actionBar={<div>action-slot</div>}
      >
        <p>content</p>
      </AppShell>,
    );

    expect(screen.getByText("action-slot")).toBeInTheDocument();
  });
});
