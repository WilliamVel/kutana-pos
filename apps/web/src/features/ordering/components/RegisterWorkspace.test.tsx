import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RegisterWorkspace } from "./RegisterWorkspace.js";

describe("RegisterWorkspace", () => {
  it("always renders the list and rail slots", () => {
    render(
      <RegisterWorkspace
        list={<p>order list</p>}
        center={null}
        emptyCenter={<p>pick one</p>}
        rail={<p>quick add</p>}
      />,
    );
    expect(screen.getByText("order list")).toBeInTheDocument();
    expect(screen.getByText("quick add")).toBeInTheDocument();
  });

  it("hides the rail slot when railHidden is set", () => {
    render(
      <RegisterWorkspace
        list={<p>order list</p>}
        center={<p>payment view</p>}
        emptyCenter={<p>pick one</p>}
        rail={<p>quick add</p>}
        railHidden
      />,
    );
    expect(screen.getByText("order list")).toBeInTheDocument();
    expect(screen.getByText("payment view")).toBeInTheDocument();
    expect(screen.queryByText("quick add")).not.toBeInTheDocument();
  });

  it("renders the empty center when there is no center content", () => {
    render(
      <RegisterWorkspace
        list={<p>order list</p>}
        center={null}
        emptyCenter={<p>Select an order to see its ticket.</p>}
        rail={<p>quick add</p>}
      />,
    );
    expect(screen.getByText("Select an order to see its ticket.")).toBeInTheDocument();
  });

  it("renders the center content instead of the empty state when provided", () => {
    render(
      <RegisterWorkspace
        list={<p>order list</p>}
        center={<p>ticket view</p>}
        emptyCenter={<p>Select an order to see its ticket.</p>}
        rail={<p>quick add</p>}
      />,
    );
    expect(screen.getByText("ticket view")).toBeInTheDocument();
    expect(
      screen.queryByText("Select an order to see its ticket."),
    ).not.toBeInTheDocument();
  });
});
