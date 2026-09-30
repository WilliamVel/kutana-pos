import { expect, test, type Page } from "@playwright/test";

const session = {
  operatorId: "operator-mina",
  displayName: "Mina",
  role: "admin",
  token: "e2e-token",
  expiresAt: "2099-01-01T00:00:00.000Z",
  refreshToken: "e2e-refresh-token",
  refreshExpiresAt: "2099-01-08T00:00:00.000Z",
};

const table = {
  id: "table-feedback",
  label: "Mesa feedback",
  status: "active",
  currentOrderId: "order-feedback",
  version: 1,
};

const products = ["Uno", "Dos", "Tres", "Cuatro"].map((name, index) => ({
  id: `product-feedback-${index}`,
  name: `Producto ${name}`,
  categoryId: "category-feedback",
  sku: `FEEDBACK-${index}`,
  priceCents: 350 + index * 100,
  taxRateBp: 1200,
  stockKind: "unit",
  pourSizeMl: null,
  imageUrl: null,
  active: true,
  version: 1,
}));

async function stubCatalogAndOrder(page: Page): Promise<void> {
  await page.addInitScript((storedSession) => {
    localStorage.setItem("kutana.auth.session", JSON.stringify(storedSession));
  }, session);

  let order = {
    id: "order-feedback",
    tableId: table.id,
    status: "active",
    openedAt: "2025-01-01T10:00:00.000Z",
    closedAt: null,
    customerId: null,
    version: 1,
    lineItems: [],
  };
  await page.route("http://localhost:3000/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    let body: unknown = [];
    if (url.pathname === "/ordering/tables") body = [table];
    else if (url.pathname === "/ordering/tables/table-feedback") body = table;
    else if (url.pathname === "/catalog/categories") body = [{ id: "category-feedback", name: "Feedback", version: 1 }];
    else if (url.pathname === "/catalog/categories/category-feedback/products") body = products;
    else if (url.pathname === "/ordering/orders") body = order;
    else if (url.pathname === "/ordering/orders/order-feedback" && request.method() === "PUT") {
      order = { ...request.postDataJSON().order, version: order.version + 1 };
      body = order;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

for (const width of [390, 1440]) {
  test(`keeps rapid-add feedback inside the catalog at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await stubCatalogAndOrder(page);
    await page.goto("/");
    await page.locator(`[data-table-id="${table.id}"]`).click();
    if (width === 390) {
      await page.getByRole("tab", { name: "Productos" }).click();
    }

    const panel = page.locator('section[aria-label="Catálogo de productos"]');
    await expect(panel).toBeVisible();
    await page.getByRole("button", { name: `Agregar ${products[0]!.name}` }).click();
    await expect(panel.getByRole("status")).toContainText(`Producto agregado: ${products[0]!.name}`);
    if (width === 390) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(panel.getByRole("status")).toBeVisible();
      expect(await panel.getByRole("status").evaluate((element) => getComputedStyle(element).position)).toBe("sticky");
    }
    const firstThree = products.slice(1, 3);
    for (const product of firstThree) {
      await page.getByRole("button", { name: `Agregar ${product.name}` }).click();
    }

    const feedback = panel.getByRole("status");
    await expect(feedback).toContainText("productos agregados");
    await expect(panel.getByRole("list")).toBeVisible();
    const measurements = await page.evaluate(() => {
      const panel = document.querySelector<HTMLElement>('section[aria-label="Catálogo de productos"]');
      const feedback = panel?.querySelector<HTMLElement>('[role="status"]');
      const grid = panel?.querySelector<HTMLElement>("ul");
      if (!panel || !feedback || !grid) throw new Error("Catalog layout elements not found");
      const rect = (element: Element) => element.getBoundingClientRect();
      const panelRect = rect(panel);
      const feedbackRect = rect(feedback);
      const gridRect = rect(grid);
      const style = getComputedStyle(feedback);
      return {
        panel: panelRect.toJSON(),
        feedback: feedbackRect.toJSON(),
        grid: gridRect.toJSON(),
        lineHeight: Number.parseFloat(style.lineHeight),
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(measurements.feedback.x).toBeGreaterThanOrEqual(measurements.panel.x);
    expect(measurements.feedback.x + measurements.feedback.width).toBeLessThanOrEqual(measurements.panel.x + measurements.panel.width);
    expect(measurements.feedback.y + measurements.feedback.height).toBeLessThanOrEqual(measurements.grid.y);
    expect(measurements.feedback.height).toBeLessThanOrEqual(measurements.lineHeight * 2 + 24);
    expect(measurements.scrollWidth).toBeLessThanOrEqual(width);
    await expect(page.getByRole("button", { name: "Deshacer lote" })).toBeVisible();
  });
}
