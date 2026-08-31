import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Panel } from "./Panel.js";

describe("Panel", () => {
  it("renders its children", () => {
    render(
      <Panel>
        <p>panel body</p>
      </Panel>,
    );
    expect(screen.getByText("panel body")).toBeInTheDocument();
  });

  it("renders the tinted header when a title is given", () => {
    render(<Panel title="Account Summary">content</Panel>);
    expect(screen.getByText("Account Summary")).toBeInTheDocument();
  });

  it("omits the header when no title is given", () => {
    const { container } = render(<Panel>content</Panel>);
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });
});
