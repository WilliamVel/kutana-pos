import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PriceTag } from "./PriceTag.js";

describe("PriceTag", () => {
  it("formats integer cents as dollars and cents", () => {
    render(<PriceTag cents={350} />);
    expect(screen.getByText("$3.50")).toBeInTheDocument();
  });

  it("pads a single-digit cents remainder with a leading zero", () => {
    render(<PriceTag cents={205} />);
    expect(screen.getByText("$2.05")).toBeInTheDocument();
  });

  it("formats zero cents correctly", () => {
    render(<PriceTag cents={0} />);
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });

  it("never loses precision for amounts that are unsafe under float division", () => {
    // 010 cents (0.10) is the canonical float-precision trap: 0.1 in binary
    // floating point is not exact. Money math in this app is integer-cents
    // only (see @kutana/shared Money) and PriceTag must format it with
    // integer arithmetic, never `(cents / 100).toFixed(2)`.
    render(<PriceTag cents={10} />);
    expect(screen.getByText("$0.10")).toBeInTheDocument();
  });

  it("formats large amounts with no thousands separator ambiguity", () => {
    render(<PriceTag cents={123456} />);
    expect(screen.getByText("$1234.56")).toBeInTheDocument();
  });
});
