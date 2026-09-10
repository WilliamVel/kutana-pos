import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PortsProvider } from "../../../composition/PortsProvider.js";
import { buildMockPorts } from "../../../composition/mock.js";
import { UserManagementContainer } from "./UserManagementContainer.js";

describe("UserManagementContainer", () => {
  it("lists existing users and creates a new operator through the user-management port", async () => {
    render(
      <PortsProvider value={buildMockPorts()}>
        <UserManagementContainer />
      </PortsProvider>,
    );

    expect(await screen.findByText("Mina")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nombre visible"), { target: { value: "Rafa" } });
    fireEvent.change(screen.getByLabelText("PIN"), { target: { value: "2468" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear usuario" }));

    await waitFor(() => expect(screen.getByText("Usuario creado.")).toBeInTheDocument());
    expect(await screen.findByText("Rafa")).toBeInTheDocument();
  });
});
