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
