import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusPill } from "./StatusPill.js";

describe("StatusPill", () => {
  it("renders the in-stock stock status with its label", () => {
    render(<StatusPill status="in-stock" />);
    expect(screen.getByText("Con stock")).toBeInTheDocument();
  });

  it("renders the low-stock stock status", () => {
    render(<StatusPill status="low-stock" />);
    expect(screen.getByText("Stock bajo")).toBeInTheDocument();
  });

  it("renders the out-of-stock stock status", () => {
    render(<StatusPill status="out-of-stock" />);
    expect(screen.getByText("Sin stock")).toBeInTheDocument();
  });

  it("renders the active order status", () => {
    render(<StatusPill status="active" />);
    expect(screen.getByText("Activa")).toBeInTheDocument();
  });

  it("renders the needs-check order status", () => {
    render(<StatusPill status="needs-check" />);
    expect(screen.getByText("Requiere revisión")).toBeInTheDocument();
  });

  it("renders the paid order status", () => {
    render(<StatusPill status="paid" />);
    expect(screen.getByText("Pagada")).toBeInTheDocument();
  });
});
