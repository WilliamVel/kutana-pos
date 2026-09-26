import { expect, test, type Page } from "@playwright/test";

const activeTable = {
  id: "table-active", label: "Mesa abierta", status: "active", currentOrderId: "order-active", version: 1,
};
const freeTable = {
  id: "table-free", label: "Mesa libre", status: "free", currentOrderId: null, version: 1,
};
const activeOrder = {
  id: "order-active", tableId: activeTable.id, status: "active", openedAt: "2025-01-01T10:00:00.000Z",
  closedAt: null, customerId: null, version: 1, lineItems: [],
};

async function stubOrderCreation(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("kutana.auth.session", JSON.stringify({
      operatorId: "operator-mina", displayName: "Mina", role: "admin",
      token: "e2e-token", expiresAt: "2099-01-01T00:00:00.000Z",
      refreshToken: "e2e-refresh-token", refreshExpiresAt: "2099-01-08T00:00:00.000Z",
    }));
  });
  let table = freeTable;
  let createdOrder: typeof activeOrder | null = null;
  await page.route("http://localhost:3000/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    let body: unknown = [];
    if (url.pathname === "/ordering/tables") body = [activeTable, table];
    else if (url.pathname === "/ordering/tables/table-free") {
      if (request.method() === "PUT") table = { ...request.postDataJSON().table, version: 2 };
      body = table;
    } else if (url.pathname.startsWith("/ordering/orders/") && request.method() === "PUT") {
      createdOrder = { ...request.postDataJSON().order, version: 1 };
      body = createdOrder;
    } else if (url.pathname === "/ordering/orders") {
      body = url.searchParams.get("tableId") === activeTable.id ? activeOrder : createdOrder;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

for (const width of [390, 1440]) {
  test(`keeps the order-created toast inside the viewport at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await stubOrderCreation(page);
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Nueva orden" })).toBeVisible();
    await page.getByRole("button", { name: "Nueva orden" }).click();
    await page.getByRole("button", { name: "Mesa libre" }).click();
    await page.getByRole("button", { name: "Crear orden" }).click();

    const toast = page.locator("[data-sonner-toast]").filter({ hasText: "Orden creada" });
    await expect(toast).toBeVisible();
    const rect = await toast.boundingBox();
    expect(rect).not.toBeNull();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
    expect(rect!.y).toBeGreaterThanOrEqual(0);
    expect(await page.locator("[data-sonner-toaster]").evaluate((node) => getComputedStyle(node).zIndex)).toBe("50");
  });
}
