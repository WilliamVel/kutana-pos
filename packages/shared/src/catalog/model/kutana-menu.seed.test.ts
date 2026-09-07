import { describe, expect, it } from "vitest";
import { KUTANA_MENU_CATEGORIES, KUTANA_MENU_PRODUCTS } from "./kutana-menu.seed.js";

describe("KUTANA PDF menu seed", () => {
  it("exports the six PDF categories in deterministic display order", () => {
    expect(KUTANA_MENU_CATEGORIES.map((category) => category.name)).toEqual([
      "Cervezas",
      "Gaseosas",
      "Bebidas",
      "Entradas",
      "Pizzas",
      "Especialidades",
    ]);
  });

  it("collapses duplicate Inca Kola and seeds all PDF products", () => {
    expect(KUTANA_MENU_PRODUCTS).toHaveLength(35);
    expect(KUTANA_MENU_PRODUCTS.filter((product) => product.name === "Inca Kola")).toHaveLength(1);
  });

  it("creates three priced pour-size products for each beer and kombucha", () => {
    const blonde = KUTANA_MENU_PRODUCTS.filter((product) => product.name.startsWith("Blonde Ale"));

    expect(blonde.map((product) => [product.pourSizeMl, product.priceCents])).toEqual([
      [330, 300],
      [500, 500],
      [1000, 800],
    ]);
    expect(blonde.every((product) => product.stockKind === "volume")).toBe(true);
    expect(blonde.every((product) => product.stockItemId === null)).toBe(true);
  });

  it("uses shared defaults required by the catalog import", () => {
    expect(KUTANA_MENU_PRODUCTS.every((product) => product.taxRateBp === 1200)).toBe(true);
    expect(KUTANA_MENU_PRODUCTS.every((product) => product.active)).toBe(true);
    expect(KUTANA_MENU_PRODUCTS.map((product) => product.sku)).toContain("MENU-ALITAS-BBQ-5");
  });
});
