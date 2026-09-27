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

    fireEvent.click(await screen.findByRole("button", { name: "Todo el historial" }));
    expect(await screen.findByText("01-20")).toBeInTheDocument();
    expect(screen.getByText("Blonde Ale 330ml")).toBeInTheDocument();
    expect(screen.getByText("Efectivo")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Personalizado" }));
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2025-01-21" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar período" }));

    await waitFor(() => expect(screen.queryByText("01-20")).not.toBeInTheDocument());
    expect(screen.getByText("01-21")).toBeInTheDocument();
  });

  it("searches the full product detail beyond the summary top five", async () => {
    const analytics = buildMockPorts().analytics;
    if (!analytics) throw new Error("Mock analytics port is required");
    renderScreen(analytics);
    fireEvent.click(await screen.findByRole("button", { name: "Todo el historial" }));
    expect(await screen.findByText("Blonde Ale 330ml")).toBeInTheDocument();
    const salesBefore = screen.getAllByText(/613,00/)[0]!;
    fireEvent.click(screen.getByRole("button", { name: "Ver todos los productos" }));
    expect(await screen.findByText(/12 resultado/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Buscar producto vendido"), { target: { value: "fuera del Top 10" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    expect(await screen.findByText("Producto fuera del Top 10")).toBeInTheDocument();
    expect(salesBefore).toBeInTheDocument();
  });

  it("stops loading and shows an error when a report request is rejected", async () => {
    const analytics: AnalyticsReadPort = {
      summary: vi.fn().mockRejectedValue(new Error("network failure")),
      dailySales: vi.fn().mockResolvedValue([]),
      productMix: vi.fn().mockResolvedValue([]),
      paymentMix: vi.fn().mockResolvedValue([]),
      pendingExposure: vi.fn().mockResolvedValue([]),
      dailyDetail: vi.fn().mockResolvedValue({ rows: [], total: 0, page: 0, pageSize: 10, granularity: "day" }),
      productDetail: vi.fn().mockResolvedValue({ rows: [], total: 0, page: 0, pageSize: 10 }),
    };

    renderScreen(analytics);

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar la analítica.");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
