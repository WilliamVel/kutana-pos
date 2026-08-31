import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import { buildMockPorts } from "../../../composition/mock.js";
import { CustomerManagementContainer } from "./CustomerManagementContainer.js";

describe("CustomerManagementContainer", () => {
  it("creates a customer through the customer port and lists it for future selection", async () => {
    const ports = buildMockPorts();
    render(
      <PortsProvider value={ports}>
        <CustomerManagementContainer />
      </PortsProvider>,
    );

    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Ada Lovelace" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "555-0101" } });
    fireEvent.click(screen.getByRole("button", { name: "Create customer" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Customer created."));
    await waitFor(() => expect(screen.getByRole("article", { name: "Customer Ada Lovelace" })).toBeInTheDocument());
    expect((await ports.customers.listAll()).some((customer) => customer.displayName === "Ada Lovelace")).toBe(true);
  });
});
