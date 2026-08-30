import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge.js";

describe("Badge", () => {
  it("renders its label", () => {
    render(<Badge tone="neutral">Draft Beer</Badge>);
    expect(screen.getByText("Draft Beer")).toBeInTheDocument();
  });

  it("exposes its tone for styling", () => {
    render(<Badge tone="success">In stock</Badge>);
    expect(screen.getByText("In stock").dataset.tone).toBe("success");
  });
});
