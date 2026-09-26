import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button.js";

describe("Button", () => {
  it("renders its label and calls onClick when pressed", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Add to order</Button>);

    const button = screen.getByRole("button", { name: "Add to order" });
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not call onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Pay
      </Button>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Pay" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("shows progress and prevents repeated clicks while loading", () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Guardar</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(onClick).toHaveBeenCalledOnce();

    rerender(<Button onClick={onClick} loading>Guardar</Button>);
    const button = screen.getByRole("button", { name: "Guardar" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector('[aria-hidden="true"]')).not.toBeNull();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();

    rerender(<Button onClick={onClick}>Guardar</Button>);
    expect(button).not.toBeDisabled();
    expect(button).not.toHaveAttribute("aria-busy");
  });

  it("defaults to the primary variant", () => {
    render(<Button onClick={() => {}}>Confirm</Button>);
    expect(screen.getByRole("button", { name: "Confirm" }).dataset.variant).toBe("primary");
  });

  it("supports the secondary variant", () => {
    render(
      <Button onClick={() => {}} variant="secondary">
        Cancel
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Cancel" }).dataset.variant).toBe("secondary");
  });
});
