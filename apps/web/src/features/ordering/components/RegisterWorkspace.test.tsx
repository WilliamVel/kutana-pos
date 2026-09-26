import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RegisterWorkspace } from "./RegisterWorkspace.js";
import styles from "./RegisterWorkspace.module.css";

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
        emptyCenter={<p>Select an order to see its payable accounts.</p>}
        rail={<p>quick add</p>}
      />,
    );
    expect(screen.getByText("Select an order to see its payable accounts.")).toBeInTheDocument();
  });

  it("owns the action slot instead of relying on a global class inside center content", () => {
    const props = {
      list: <p>order list</p>,
      emptyCenter: <p>pick one</p>,
      rail: <p>quick add</p>,
      actions: <button type="button">Pay order</button>,
    };
    const { rerender } = render(<RegisterWorkspace {...props} center={<p>account view</p>} />);

    const button = screen.getByRole("button", { name: "Pay order" });
    expect(styles.centerActions).toBeDefined();
    expect(button.parentElement).toHaveClass(styles.centerActions!);

    rerender(<RegisterWorkspace {...props} center={null} />);
    expect(screen.queryByRole("button", { name: "Pay order" })).not.toBeInTheDocument();
  });

  it("renders the center content instead of the empty state when provided", () => {
    render(
      <RegisterWorkspace
        list={<p>order list</p>}
        center={<p>account view</p>}
        emptyCenter={<p>Select an order to see its payable accounts.</p>}
        rail={<p>quick add</p>}
      />,
    );
    expect(screen.getByText("account view")).toBeInTheDocument();
    expect(
      screen.queryByText("Select an order to see its payable accounts."),
    ).not.toBeInTheDocument();
  });
});
