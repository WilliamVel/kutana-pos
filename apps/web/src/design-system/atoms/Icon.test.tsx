import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon } from "./Icon.js";

describe("Icon", () => {
  it("renders as a decorative element hidden from assistive tech when unlabeled", () => {
    const { container } = render(<Icon name="beer" />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it("exposes an accessible name when a label is provided", () => {
    render(<Icon name="warning" label="Low stock" />);
    expect(screen.getByRole("img", { name: "Low stock" })).toBeInTheDocument();
  });
});
