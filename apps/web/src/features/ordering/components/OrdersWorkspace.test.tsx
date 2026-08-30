import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrdersWorkspace } from "./OrdersWorkspace.js";

describe("OrdersWorkspace", () => {
  it("always renders the list slot", () => {
    render(
      <OrdersWorkspace
        list={<p>order list</p>}
        detail={null}
        emptyDetail={<p>pick one</p>}
      />,
    );
    expect(screen.getByText("order list")).toBeInTheDocument();
  });

  it("renders the empty state when there is no detail", () => {
    render(
      <OrdersWorkspace
        list={<p>order list</p>}
        detail={null}
        emptyDetail={<p>Select an order to see its items.</p>}
      />,
    );
    expect(screen.getByText("Select an order to see its items.")).toBeInTheDocument();
  });

  it("renders the detail slot instead of the empty state when a detail is provided", () => {
    render(
      <OrdersWorkspace
        list={<p>order list</p>}
        detail={<p>ticket detail</p>}
        emptyDetail={<p>Select an order to see its items.</p>}
      />,
    );
    expect(screen.getByText("ticket detail")).toBeInTheDocument();
    expect(
      screen.queryByText("Select an order to see its items."),
    ).not.toBeInTheDocument();
  });
});
