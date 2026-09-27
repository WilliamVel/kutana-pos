import { expect, test } from "@playwright/test";

const summary = {
  timezone: "America/Guayaquil",
  currencyCode: "USD",
  from: "2025-01-20",
  to: "2025-01-22",
  grossSalesCents: 61300,
  collectedCents: 61300,
  orderCount: 3,
  averageOrderCents: 20433,
  dailySales: [
    { date: "2025-01-20", currencyCode: "USD", totalCents: 18450 },
    { date: "2025-01-21", currencyCode: "USD", totalCents: 23100 },
    { date: "2025-01-22", currencyCode: "USD", totalCents: 19750 },
  ],
  productMix: [
    { productId: "food-1", name: "Hamburguesa KUTANA", presentationSize: null, quantity: 18, revenueCents: 21600, currencyCode: "USD" },
    { productId: "beer-1", name: "Blonde Ale 330ml", presentationSize: null, quantity: 42, revenueCents: 12600, currencyCode: "USD" },
  ],
  paymentMix: [{ methodCode: "CASH", methodLabel: "Cash", amountCents: 61300, currencyCode: "USD" }],
  pendingExposure: [],
};

test.describe("sales analytics responsive layout", () => {
  for (const width of [1440, 390]) {
    test(`keeps analytics content usable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(() => {
        localStorage.setItem("kutana.auth.session", JSON.stringify({
          operatorId: "operator-mina", displayName: "Mina", role: "admin",
          token: "e2e-token", expiresAt: "2099-01-01T00:00:00.000Z",
          refreshToken: "e2e-refresh-token", refreshExpiresAt: "2099-01-08T00:00:00.000Z",
        }));
      });
      await page.route("http://localhost:3000/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        const body = path === "/billing/analytics/summary" ? summary : path === "/billing/analytics/daily-sales-detail" ? { rows: summary.dailySales, total: summary.dailySales.length, page: 0, pageSize: 10, granularity: "day" } : path === "/billing/analytics/products" ? { rows: summary.productMix, total: summary.productMix.length, page: 0, pageSize: 10 } : path === "/auth/session" ? { operatorId: "operator-mina", displayName: "Mina", role: "admin" } : [];
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
      });
      await page.goto("/");
      if (width < 700) await page.getByRole("button", { name: "Abrir menú de navegación" }).click();
      await page.getByRole("button", { name: "Más" }).click();
      await page.getByRole("button", { name: "Analítica" }).click();
      await expect(page.getByRole("heading", { name: "Analítica de ventas" })).toBeVisible();
      await expect(page.getByText("Hamburguesa KUTANA")).toBeVisible();
      await page.getByRole("button", { name: "Ver detalle diario" }).click();
      await expect(page.getByRole("table")).toHaveCount(1);
      await page.getByRole("button", { name: "Ocultar detalle diario" }).click();
      await page.getByRole("button", { name: "Ver todos los productos" }).click();
      await expect(page.getByRole("table")).toHaveCount(1);
      const screen = page.locator('[class*="screen"]').first();
      const bounds = await screen.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { right: rect.right, viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth };
      });
      expect(bounds.right).toBeLessThanOrEqual(bounds.viewport + 1);
      expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.viewport + 1);
      await expect(page.locator("input").last()).toBeVisible();
    });
  }
});
