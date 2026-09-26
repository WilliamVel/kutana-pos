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
  id: "table-layout",
  label: "Mesa de prueba",
  status: "active",
  currentOrderId: "order-layout",
  version: 1,
};

const order = {
  id: "order-layout",
  tableId: table.id,
  status: "active",
  openedAt: "2025-01-01T10:00:00.000Z",
  closedAt: null,
  customerId: null,
  version: 1,
  lineItems: [
    {
      id: "line-layout",
      orderId: "order-layout",
      productId: "product-layout",
      nameSnapshot: "KUTANA Pilsener 500ml",
      unitPriceCents: 350,
      quantity: 2,
      pourSizeMl: 500,
      taxRateBp: 1200,
      taxCents: 84,
      totalCents: 784,
      isAdjustment: false,
      createdAt: "2025-01-01T10:00:00.000Z",
    },
  ],
};

const desktopOrder = {
  ...order,
  lineItems: [
    ...order.lineItems,
    {
      id: "line-fioravanti",
      orderId: order.id,
      productId: "product-fioravanti",
      nameSnapshot: "Fioravanti",
      unitPriceCents: 250,
      quantity: 1,
      pourSizeMl: null,
      taxRateBp: 1200,
      taxCents: 30,
      totalCents: 280,
      isAdjustment: false,
      createdAt: "2025-01-01T10:01:00.000Z",
    },
  ],
};

const longOrder = {
  ...desktopOrder,
  lineItems: Array.from({ length: 9 }, (_, index) => ({
    ...(desktopOrder.lineItems[index % desktopOrder.lineItems.length] ?? desktopOrder.lineItems[0]),
    id: `line-long-${index}`,
    nameSnapshot: index === 8 ? "Último producto visible" : `Producto agregado ${index + 1}`,
  })),
};

async function stubLoadedOrder(page: Page, loadedOrder = order): Promise<void> {
  await page.addInitScript((storedSession) => {
    localStorage.setItem("kutana.auth.session", JSON.stringify(storedSession));
  }, session);

  await page.route("http://localhost:3000/**", async (route) => {
    const url = new URL(route.request().url());
    let body: unknown = [];

    if (url.pathname === "/ordering/tables") body = [table];
    else if (url.pathname === "/ordering/tables/table-layout") body = table;
    else if (url.pathname === "/ordering/orders") body = loadedOrder;
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

for (const viewport of [
  { width: 390, height: 844, name: "mobile-390" },
  { width: 768, height: 1024, name: "tablet-768" },
  { width: 1440, height: 900, name: "desktop-1440" },
]) {
  test(`keeps the loaded order flow in bounds at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await stubLoadedOrder(page);
    await page.goto("/");

    const orderCard = page.locator(`[data-table-id="${table.id}"]`);
    await expect(orderCard).toBeVisible();
    await orderCard.click();
    const panel = page.locator('section[aria-label="Resumen de orden para Mesa de prueba"]');
    await expect(panel).toBeVisible();
    await expect(page.getByRole("button", { name: "Pagar mesa completa" })).toBeVisible();

    const measurements = await page.evaluate(() => {
      const panel = document.querySelector<HTMLElement>('section[aria-label="Resumen de orden para Mesa de prueba"]');
      if (!panel) throw new Error("Order panel not found");
      const summary = panel.querySelector<HTMLElement>("[data-layout-summary]");
      const actions = panel.parentElement?.querySelector<HTMLElement>('button[aria-label="Pagar mesa completa"]')?.parentElement;
      if (!summary || !actions) throw new Error("Summary or actions not found");
      const rect = (element: Element) => {
        const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
        return { left, right, top, bottom, width, height };
      };
      const tableElement = panel.querySelector<HTMLTableElement>("table");
      const firstRow = tableElement?.querySelector<HTMLTableRowElement>("tbody tr");
      const firstCell = firstRow?.querySelector<HTMLTableCellElement>("td");
      const tableStyles = tableElement ? getComputedStyle(tableElement) : null;
      const rowStyles = firstRow ? getComputedStyle(firstRow) : null;
      const cellStyles = firstCell ? getComputedStyle(firstCell) : null;
      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        tableDisplay: tableStyles?.display,
        rowDisplay: rowStyles?.display,
        cellDisplay: cellStyles?.display,
        rowBoxShadow: rowStyles?.boxShadow,
        cellBorderBottomStyle: cellStyles?.borderBottomStyle,
        scrollWidth: document.documentElement.scrollWidth,
        panel: rect(panel),
        summary: rect(summary),
        actions: rect(actions),
        parentChain: (() => {
          const chain: unknown[] = [];
          let current: HTMLElement | null = panel;
          while (current) {
            const styles = getComputedStyle(current);
            chain.push({
              tag: current.tagName,
              className: current.className,
              rect: rect(current),
              display: styles.display,
              position: styles.position,
              width: styles.width,
              minWidth: styles.minWidth,
              maxWidth: styles.maxWidth,
              gridTemplateColumns: styles.gridTemplateColumns,
              overflowX: styles.overflowX,
              transform: styles.transform,
            });
            current = current.parentElement;
          }
          return chain;
        })(),
      };
    });

    await page.screenshot({ path: testInfo.outputPath(`${viewport.name}.png`), fullPage: true });
    await testInfo.attach(`${viewport.name}-measurements.json`, {
      body: JSON.stringify(measurements, null, 2),
      contentType: "application/json",
    });

    expect(measurements.scrollWidth).toBeLessThanOrEqual(measurements.viewport.width);
    if (viewport.width > 1024) {
      expect(measurements.tableDisplay).toBe("table");
      expect(measurements.rowDisplay).toBe("table-row");
      expect(measurements.cellDisplay).toBe("table-cell");
      expect(measurements.cellBorderBottomStyle).toBe("none");
    }
    expect(measurements.panel.left).toBeGreaterThanOrEqual(0);
    expect(measurements.panel.right).toBeLessThanOrEqual(measurements.viewport.width);
    expect(measurements.summary.left).toBeGreaterThanOrEqual(measurements.panel.left);
    expect(measurements.summary.right).toBeLessThanOrEqual(measurements.panel.right);
    expect(measurements.actions.top).toBeGreaterThanOrEqual(measurements.summary.bottom);
    expect(measurements.actions.left).toBeGreaterThanOrEqual(measurements.panel.left);
    expect(measurements.actions.right).toBeLessThanOrEqual(measurements.panel.right);
  });
}

test("keeps the mobile order-count badge readable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await stubLoadedOrder(page);
  await page.goto("/");
  await page.locator(`[data-table-id="${table.id}"]`).click();
  await page.evaluate((tableId) => {
    window.dispatchEvent(new CustomEvent("kutana.order.updated", {
      detail: { tableId, orderCount: 2 },
    }));
  }, table.id);
  const badge = page.getByRole("tab", { name: /Pedido 2/ }).locator("strong");
  await expect(badge).toBeVisible();
  const contrast = await badge.evaluate((element) => {
    const rgb = (value: string) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const luminance = (value: string) => {
      const channels = rgb(value).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return (channels[0] ?? 0) * 0.2126 + (channels[1] ?? 0) * 0.7152 + (channels[2] ?? 0) * 0.0722;
    };
    const style = getComputedStyle(element);
    const front = luminance(style.color);
    const back = luminance(style.backgroundColor);
    return (Math.max(front, back) + 0.05) / (Math.min(front, back) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});

test("keeps desktop dividers continuous with and without a variant", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubLoadedOrder(page, desktopOrder);
  await page.goto("/");
  await page.locator(`[data-table-id="${table.id}"]`).click();
  const panel = page.locator('section[aria-label="Resumen de orden para Mesa de prueba"]');
  await expect(panel).toBeVisible();
  await expect(page.getByRole("button", { name: "Pagar mesa completa" })).toBeVisible();

  const result = await panel.locator("table").evaluate((table) => {
    const rows = Array.from(table.tBodies[0]?.rows ?? []);
    return {
      rowCount: rows.length,
      displays: rows.map((row) => ({
        row: getComputedStyle(row).display,
        cells: Array.from(row.cells).map((cell) => ({
          display: getComputedStyle(cell).display,
          border: getComputedStyle(cell).borderBottomStyle,
        })),
        boxShadow: getComputedStyle(row).boxShadow,
      })),
    };
  });

  expect(result.rowCount).toBe(2);
  expect(result.displays[0]?.row).toBe("table-row");
  expect(result.displays[0]?.boxShadow).not.toBe("none");
  expect(result.displays[0]?.cells.every((cell) => cell.display === "table-cell" && cell.border === "none")).toBe(true);
  expect(result.displays[1]?.row).toBe("table-row");
  expect(result.displays[1]?.boxShadow).toBe("none");
  expect(result.displays[1]?.cells.every((cell) => cell.display === "table-cell" && cell.border === "none")).toBe(true);

  await page.screenshot({ path: testInfo.outputPath("desktop-dividers-1440.png"), fullPage: true });
});

test("scrolls nine selected products without cutting the summary or actions", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await stubLoadedOrder(page, longOrder);
  await page.goto("/");
  await page.locator(`[data-table-id="${table.id}"]`).click();
  const panel = page.locator('section[aria-label="Resumen de orden para Mesa de prueba"]');
  await expect(panel).toBeVisible();
  await expect(page.getByRole("button", { name: "Pagar mesa completa" })).toBeVisible();

  const result = await panel.evaluate((element) => {
    const scroller = element.querySelector<HTMLElement>("[data-layout-products]")!;
    const summary = element.querySelector<HTMLElement>("[data-layout-summary]")!;
    const actions = element.parentElement?.querySelector<HTMLElement>('button[aria-label="Pagar mesa completa"]')?.parentElement;
    if (!scroller || !summary || !actions) throw new Error("Missing order layout region");
    scroller.scrollTop = scroller.scrollHeight;
    const scrollerRect = scroller.getBoundingClientRect();
    const lastRow = scroller.querySelector<HTMLElement>("tbody tr:last-child")!.getBoundingClientRect();
    const summaryRect = summary.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();
    return {
      hasScroll: scroller.scrollHeight > scroller.clientHeight,
      lastRowVisible: lastRow.bottom <= scrollerRect.bottom + 1,
      summaryVisible: summaryRect.bottom <= actionsRect.top,
      actionsBelowSummary: actionsRect.top >= summaryRect.bottom,
      panelRect: element.getBoundingClientRect().toJSON(),
      summaryRect: summaryRect.toJSON(),
      actionsRect: actionsRect.toJSON(),
    };
  });

  expect(result.hasScroll).toBe(true);
  expect(result.lastRowVisible).toBe(true);
  expect(result.summaryVisible).toBe(true);
  expect(result.actionsBelowSummary).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("desktop-nine-products-1440.png"), fullPage: true });
});
