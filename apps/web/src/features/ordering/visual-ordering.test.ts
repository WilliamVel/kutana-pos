import { describe, expect, it } from "vitest";
import type { OrderTicketPanelLine } from "./components/OrderTicketPanel.js";
import { orderTicketLines, sectionizeOrderTicketLines } from "./visual-ordering.js";

const line = (
  id: string,
  productId: string,
  overrides: Partial<OrderTicketPanelLine> = {},
): OrderTicketPanelLine => ({
  id,
  productId,
  name: id,
  quantity: 1,
  unitPriceCents: 100,
  totalCents: 100,
  pourSizeMl: null,
  isAdjustment: false,
  ...overrides,
});

const metadata = new Map([
  ["330", { stockKind: "volume" as const, pourSizeMl: 330 }],
  ["500", { stockKind: "volume" as const, pourSizeMl: 500 }],
  ["750", { stockKind: "volume" as const, pourSizeMl: 750 }],
  ["1000", { stockKind: "volume" as const, pourSizeMl: 1000 }],
  ["soda", { stockKind: "unit" as const, categoryName: "Gaseosas" }],
  ["other-drink", { stockKind: "volume" as const, pourSizeMl: 1250 }],
  ["food", { stockKind: "unit" as const, categoryName: "Comida" }],
]);

describe("orderTicketLines", () => {
  it("orders beverage sizes, gaseosas, other beverages, food, then adjustments stably", () => {
    const source = [
      line("food-1", "food"),
      line("pour-750", "750"),
      line("adjustment", "unknown", { isAdjustment: true }),
      line("soda", "soda"),
      line("pour-330", "330"),
      line("other", "other-drink"),
      line("pour-500", "500"),
      line("pour-1000", "1000"),
      line("food-2", "food"),
    ];
    expect(orderTicketLines(source, metadata).map((item) => item.id)).toEqual([
      "pour-330",
      "pour-500",
      "pour-750",
      "pour-1000",
      "soda",
      "other",
      "food-1",
      "food-2",
      "adjustment",
    ]);
    expect(source.map((item) => item.id)).toEqual([
      "food-1",
      "pour-750",
      "adjustment",
      "soda",
      "pour-330",
      "other",
      "pour-500",
      "pour-1000",
      "food-2",
    ]);
  });

  it("uses food fallback for missing metadata and unknown non-beverage products", () => {
    const source = [line("missing", "missing"), line("unknown", "unknown")];
    expect(orderTicketLines(source, new Map()).map((item) => item.id)).toEqual([
      "missing",
      "unknown",
    ]);
  });

  it("uses the persisted pour size for a missing catalog match and current category for bottled beverages", () => {
    const source = [
      line("food", "food"),
      line("missing-beverage", "deleted", {
        pourSizeMl: 550 as unknown as OrderTicketPanelLine["pourSizeMl"],
      }),
      line("bottled", "bottled"),
    ];
    const currentCatalog = new Map([
      ["food", { categoryName: "Comida", stockKind: "unit" as const }],
      ["bottled", { categoryName: "Bottled Beer", stockKind: "unit" as const }],
    ]);
    expect(orderTicketLines(source, currentCatalog).map((item) => item.id)).toEqual([
      "missing-beverage",
      "bottled",
      "food",
    ]);
  });

  it("keeps unsupported beverage sizes in other beverages and emits only non-empty headers", () => {
    const sections = sectionizeOrderTicketLines(
      [
        line("other", "other-drink"),
        line("food", "food"),
        line("adjustment", "x", { isAdjustment: true }),
      ],
      metadata,
    );
    expect(sections.map((section) => section.label)).toEqual(["Bebidas", "Comida", "Ajustes"]);
    expect(sections[0]?.lines.map((item) => item.id)).toEqual(["other"]);
  });
});
