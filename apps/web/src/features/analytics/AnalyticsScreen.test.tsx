import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AnalyticsReadPort } from "@kutana/shared/analytics/ports/analytics-service.js";
import { PortsProvider } from "../../composition/PortsProvider.js";
import { buildMockPorts } from "../../composition/mock.js";
import { AnalyticsScreen } from "./AnalyticsScreen.js";

function renderScreen(analytics: AnalyticsReadPort): void {
  render(
    <PortsProvider value={{ ...buildMockPorts(), analytics }}>
      <AnalyticsScreen />
    </PortsProvider>,
  );
}

describe("AnalyticsScreen", () => {
  it("renders the analytics fixture and reapplies the date filter", async () => {
    const analytics = buildMockPorts().analytics;
    if (!analytics) throw new Error("Mock analytics port is required");
    renderScreen(analytics);

    expect(await screen.findByText("2025-01-20")).toBeInTheDocument();
    expect(screen.getByText("Blonde Ale 330ml")).toBeInTheDocument();
    expect(screen.getByText("Sin cliente vinculado")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2025-01-21" } });

    await waitFor(() => expect(screen.queryByText("2025-01-20")).not.toBeInTheDocument());
    expect(screen.getByText("2025-01-21")).toBeInTheDocument();
  });

  it("stops loading and shows an error when a report request is rejected", async () => {
    const analytics: AnalyticsReadPort = {
      dailySales: vi.fn().mockRejectedValue(new Error("network failure")),
      productMix: vi.fn().mockResolvedValue([]),
      paymentMix: vi.fn().mockResolvedValue([]),
      pendingExposure: vi.fn().mockResolvedValue([]),
    };

    renderScreen(analytics);

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar la analítica.");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
