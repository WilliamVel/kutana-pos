import { expect, test, type Page } from "@playwright/test";

const labels = ["mas12", "Pedido wiliveliz24@gmail.com", "x".repeat(60), "Mesa de prueba"];

async function openRegister(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Usuario").fill("Mina");
  await page.locator('input[name="pin"]').fill("1234");
  await page.getByRole("button", { name: "Ingresar" }).click();
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
          const range = document.createRange();
          range.selectNodeContents(title);
          const titleLines = new Set(
            Array.from(range.getClientRects()).map((rect) => Math.round(rect.top)),
          ).size;
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
            titleLines,
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
        expect(measurement.titleLines).toBeLessThanOrEqual(2);
        expect(measurement.titleHeight).toBeLessThanOrEqual(measurement.maxTitleHeight);
        expect(measurement.wordBreak).toBe("normal");
        expect(measurement.titleRight).toBeLessThanOrEqual(measurement.cardRight + 1);
        expect(measurement.descendantsFit).toBe(true);
      }
    });
  }
});
