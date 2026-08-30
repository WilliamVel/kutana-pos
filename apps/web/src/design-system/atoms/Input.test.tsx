import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Input } from "./Input.js";

describe("Input", () => {
  it("renders a labeled text field and reports changes", () => {
    const onChange = vi.fn();
    render(<Input label="Product name" value="" onChange={onChange} />);

    const field = screen.getByLabelText("Product name");
    fireEvent.change(field, { target: { value: "KUTANA Pilsener" } });

    expect(onChange).toHaveBeenCalledWith("KUTANA Pilsener");
  });

  it("reflects the current value", () => {
    render(<Input label="SKU" value="DRAFT-PILS-500" onChange={() => {}} />);
    expect(screen.getByLabelText("SKU")).toHaveValue("DRAFT-PILS-500");
  });

  it("shows an error message and marks the field invalid when provided", () => {
    render(<Input label="Price" value="" onChange={() => {}} error="Price is required" />);

    expect(screen.getByText("Price is required")).toBeInTheDocument();
    expect(screen.getByLabelText("Price")).toBeInvalid();
  });
});
