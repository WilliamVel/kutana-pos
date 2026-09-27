import { expect, test, type Page } from "@playwright/test";

const labels = ["mas12", "Pedido wiliveliz24@gmail.com", "x".repeat(60), "Mesa de prueba"];

async function openRegister(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("kutana.auth.session", JSON.stringify({
      operatorId: "operator-mina", displayName: "Mina", role: "admin",
      token: "e2e-token", expiresAt: "2099-01-01T00:00:00.000Z",
      refreshToken: "e2e-refresh-token", refreshExpiresAt: "2099-01-08T00:00:00.000Z",
    }));
  });
  await page.route("http://localhost:3000/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const table = { id: "table-layout", label: "Mesa de prueba", status: "active", currentOrderId: "order-layout", version: 1 };
    const order = { id: "order-layout", tableId: table.id, status: "active", openedAt: "2025-01-01T10:00:00.000Z", closedAt: null, customerId: null, version: 1, lineItems: [] };
    const body = path === "/ordering/tables" ? [table] : path === "/ordering/orders" ? order : path === "/ordering/tables/table-layout" ? table : [];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Órdenes activas" })).toBeVisible();
}

test.describe("active order card layout", () => {
  for (const width of [1440, 430, 375, 320]) {
    test(`keeps titles and payment within cards at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openRegister(page);

      const cards = page.locator('section[aria-label="Órdenes activas"] [data-table-id]');
      await expect(cards.first()).toBeVisible();
      await cards.evaluateAll((elements, values) => {
        const list = elements[0]?.parentElement;
        while (
          list &&
          list.querySelectorAll("[data-table-id]").length < values.length &&
          elements[0]
        ) {
          const clone = elements[0].cloneNode(true) as HTMLElement;
          clone.dataset.tableId = `layout-fixture-${list.children.length}`;
          list.appendChild(clone);
        }
        list?.querySelectorAll<HTMLElement>("[data-table-id]").forEach((card, index) => {
          const title = card.querySelector<HTMLElement>("[data-order-title]");
          if (!title || index >= values.length) return;
          title.textContent = values[index] ?? "";
          title.setAttribute("aria-label", values[index] ?? "");
        });
        window.dispatchEvent(new Event("resize"));
      }, labels);

      const measurements = await cards.evaluateAll((elements) =>
        elements.slice(0, 4).map((card) => {
          const cardRect = card.getBoundingClientRect();
          const title = card.querySelector<HTMLElement>("[data-order-title]")!;
          const titleRect = title.getBoundingClientRect();
          // A Range includes clipped lines even when -webkit-line-clamp hides them.
          // Measure the painted box instead of counting its unclipped text fragments.
          const lineHeight = Number.parseFloat(getComputedStyle(title).lineHeight);
          const descendantsFit = Array.from(
            card.querySelectorAll<HTMLElement>("*:not([role=tooltip])"),
          ).every((element) => {
            const rect = element.getBoundingClientRect();
            return (
              rect.left >= cardRect.left - 1 &&
              rect.right <= cardRect.right + 1 &&
              rect.top >= cardRect.top - 1 &&
              rect.bottom <= cardRect.bottom + 1
            );
          });
          return {
            cardWidth: cardRect.width,
            titleWidth: titleRect.width,
            titleHeight: titleRect.height,
            maxTitleHeight: lineHeight * 2 + 2,
            wordBreak: getComputedStyle(title).wordBreak,
            titleRight: titleRect.right,
            cardRight: cardRect.right,
            descendantsFit,
          };
        }),
      );

      expect(measurements).toHaveLength(4);
      for (const measurement of measurements) {
        expect(measurement.cardWidth).toBeGreaterThan(120);
        expect(measurement.titleWidth).toBeGreaterThan(40);
        expect(measurement.titleHeight).toBeLessThanOrEqual(measurement.maxTitleHeight);
        expect(measurement.wordBreak).toBe("normal");
        expect(measurement.titleRight).toBeLessThanOrEqual(measurement.cardRight + 1);
        expect(measurement.descendantsFit).toBe(true);
      }
    });
  }

  for (const width of [430, 375, 320]) {
    test(`fills the mobile carousel viewport without page overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openRegister(page);

      const section = page.locator('section[aria-label="Órdenes activas"]');
      const list = section.locator('[aria-label="Mesas activas"]');
      await expect(list).toBeVisible();

      const measurements = await section.evaluate((element) => {
        const viewport = element.querySelector<HTMLElement>('[aria-label="Mesas activas"]')!;
        const actions = element.querySelector<HTMLElement>('[class*="headerActions"]')!;
        const viewportRect = viewport.getBoundingClientRect();
        const actionsRect = actions.getBoundingClientRect();
        return {
          viewportRight: viewportRect.right,
          actionsRight: actionsRect.right,
          viewportWidth: viewportRect.width,
          documentWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        };
      });

      expect(measurements.viewportWidth).toBeGreaterThan(0);
      expect(Math.abs(measurements.viewportRight - measurements.actionsRight)).toBeLessThanOrEqual(1);
      expect(measurements.documentWidth).toBeLessThanOrEqual(measurements.innerWidth);
    });
  }
});
