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
  id: "table-four",
  label: "Mesa 4",
  status: "active",
  currentOrderId: "order-table-four",
  version: 1,
};

const order = {
  id: table.currentOrderId,
  tableId: table.id,
  status: "active",
  openedAt: "2025-01-01T10:00:00.000Z",
  closedAt: null,
  customerId: null,
  version: 1,
  lineItems: [
    ...Array.from({ length: 8 }, (_, index) => ({
      id: `line-four-${index}`,
      orderId: table.currentOrderId,
      productId: `product-four-${index}`,
      nameSnapshot: `Producto ${index + 1}`,
      unitPriceCents: 300,
      quantity: 1,
      pourSizeMl: null,
      taxRateBp: 0,
      taxCents: 0,
      totalCents: 300,
      isAdjustment: false,
      createdAt: `2025-01-01T10:0${index}:00.000Z`,
    })),
    {
      id: "line-coca-cola",
      orderId: table.currentOrderId,
      productId: "product-coca-cola",
      nameSnapshot: "Coca-Cola",
      unitPriceCents: 450,
      quantity: 3,
      pourSizeMl: null,
      taxRateBp: 0,
      taxCents: 0,
      totalCents: 1350,
      isAdjustment: false,
      createdAt: "2025-01-01T10:08:00.000Z",
    },
  ],
};

async function stubMesaCuatro(page: Page): Promise<void> {
  await page.addInitScript((storedSession) => {
    localStorage.setItem("kutana.auth.session", JSON.stringify(storedSession));
    const win = window as Window & { __scrollIntoViewCalls?: number };
    win.__scrollIntoViewCalls = 0;
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = function (...args) {
      win.__scrollIntoViewCalls = (win.__scrollIntoViewCalls ?? 0) + 1;
      return originalScrollIntoView.apply(this, args);
    };
  }, session);

  await page.route("http://localhost:3000/**", async (route) => {
    const url = new URL(route.request().url());
    let body: unknown = [];
    if (url.pathname === "/ordering/tables") body = [table];
    else if (url.pathname === "/ordering/tables/table-four") body = table;
    else if (url.pathname === "/ordering/orders") body = order;
    else if (url.pathname === "/billing/personal-accounts") body = [];
    else if (url.pathname.endsWith("/account-line-allocations")) body = [];
    else if (url.pathname === "/billing/customers") body = [];
    else if (url.pathname === "/payments") body = [];

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

test("Mesa 4 mantiene el scroll al seleccionar Coca-Cola en división de productos", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await stubMesaCuatro(page);
  await page.goto("/");

  await page.locator(`[data-table-id="${table.id}"]`).click();
  await page.getByRole("button", { name: "Dividir cuenta" }).click();
  await page.getByRole("menuitem", { name: "Cobrar productos" }).click();

  const coca = page.getByText(/Coca-Cola/, { exact: false }).last();
  await expect(coca).toBeVisible();
  await coca.scrollIntoViewIfNeeded();

  const beforeSelection = await page.evaluate(() => window.scrollY);
  const scrollCallsBeforeSelection = await page.evaluate(
    () => (window as Window & { __scrollIntoViewCalls?: number }).__scrollIntoViewCalls ?? 0,
  );
  expect(beforeSelection).toBeGreaterThan(0);

  const cocaRow = page.locator("article").filter({ hasText: "Coca-Cola" }).last();
  await cocaRow.getByRole("checkbox").check();
  await expect(page.getByRole("spinbutton", { name: "Cantidad de Coca-Cola", exact: true })).toBeVisible();
  await page.waitForTimeout(800);
  const afterSelection = await page.evaluate(() => window.scrollY);
  const scrollCallsAfterSelection = await page.evaluate(
    () => (window as Window & { __scrollIntoViewCalls?: number }).__scrollIntoViewCalls ?? 0,
  );
  expect(scrollCallsAfterSelection).toBe(scrollCallsBeforeSelection);
  expect(afterSelection).toBeGreaterThan(beforeSelection * 0.9);

  await page.getByRole("spinbutton", { name: "Cantidad de Coca-Cola", exact: true }).fill("2");
  await expect(page.getByRole("spinbutton", { name: "Cantidad de Coca-Cola", exact: true })).toHaveValue("2");
  const afterQuantity = await page.evaluate(() => window.scrollY);
  expect(afterQuantity).toBeGreaterThan(afterSelection * 0.9);

  await testInfo.attach("scroll-measurements.json", {
    body: JSON.stringify({ beforeSelection, afterSelection, afterQuantity }, null, 2),
    contentType: "application/json",
  });
});
