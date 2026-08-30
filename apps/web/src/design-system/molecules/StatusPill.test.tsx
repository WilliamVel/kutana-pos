import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusPill } from "./StatusPill.js";

describe("StatusPill", () => {
  it("renders the in-stock stock status with its label", () => {
    render(<StatusPill status="in-stock" />);
    expect(screen.getByText("In stock")).toBeInTheDocument();
  });

  it("renders the low-stock stock status", () => {
    render(<StatusPill status="low-stock" />);
    expect(screen.getByText("Low stock")).toBeInTheDocument();
  });

  it("renders the out-of-stock stock status", () => {
    render(<StatusPill status="out-of-stock" />);
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });

  it("renders the active order status", () => {
    render(<StatusPill status="active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders the needs-check order status", () => {
    render(<StatusPill status="needs-check" />);
    expect(screen.getByText("Needs check")).toBeInTheDocument();
  });

  it("renders the paid order status", () => {
    render(<StatusPill status="paid" />);
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });
});
