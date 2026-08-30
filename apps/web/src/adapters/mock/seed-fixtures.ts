import { createCategory, type Category } from "@kutana/shared/catalog/model/category.js";
import { createProduct, type Product } from "@kutana/shared/catalog/model/product.js";
import { createStockItem, type StockItem } from "@kutana/shared/inventory/model/stock-item.js";
import { createOrder, type Order } from "@kutana/shared/ordering/model/order.js";
import { addLineItem } from "@kutana/shared/ordering/services/line-item-service.js";
import { createTable, occupyTable, type Table } from "@kutana/shared/ordering/model/table.js";

/**
 * Demo seed data for the KUTANA brewery/taproom, used to wire the mock
 * adapters for the milestone-1 demo build. Every shape here is imported
 * from `@kutana/shared` — no ad-hoc/local product/category/table/order
 * shape is declared, per the "mock the DATA, never the TYPES" rule
 * (enforced by the ESLint boundary guard banning locally-redeclared
 * domain interfaces in `apps/web`).
 */
export interface SeedFixtures {
  readonly categories: readonly Category[];
  readonly stockItems: readonly StockItem[];
  readonly products: readonly Product[];
  readonly tables: readonly Table[];
  readonly openOrder: Order;
}

export function buildSeedFixtures(): SeedFixtures {
  const categories: Category[] = [
    createCategory({ id: "category-draft-beer", name: "Draft Beer", sortOrder: 1 }),
    createCategory({ id: "category-bottled-beer", name: "Bottled Beer", sortOrder: 2 }),
    createCategory({ id: "category-food", name: "Food", sortOrder: 3 }),
  ];

  const kegPilsener: StockItem = createStockItem({
    id: "stock-keg-pilsener",
    name: "Keg - KUTANA Pilsener",
    kind: "volume",
    unit: "ml",
    quantity: 30_000,
    lowStockLevel: 3_000,
  });
  const kegSessionIpa: StockItem = createStockItem({
    id: "stock-keg-session-ipa",
    name: "Keg - KUTANA Session IPA",
    kind: "volume",
    unit: "ml",
    quantity: 20_000,
    lowStockLevel: 3_000,
  });
  const bottledStout: StockItem = createStockItem({
    id: "stock-bottled-stout",
    name: "KUTANA Stout 330ml Bottle",
    kind: "unit",
    unit: "ea",
    quantity: 48,
    lowStockLevel: 12,
  });

  const stockItems: StockItem[] = [kegPilsener, kegSessionIpa, bottledStout];

  const products: Product[] = [
    createProduct({
      id: "product-pilsener-500",
      sku: "DRAFT-PILS-500",
      barcode: "7501000000001",
      name: "KUTANA Pilsener 500ml",
      categoryId: "category-draft-beer",
      priceCents: 350,
      taxRateBp: 1200,
      stockKind: "volume",
      pourSizeMl: 500,
      stockItemId: kegPilsener.id,
    }),
    createProduct({
      id: "product-pilsener-750",
      sku: "DRAFT-PILS-750",
      barcode: "7501000000002",
      name: "KUTANA Pilsener 750ml",
      categoryId: "category-draft-beer",
      priceCents: 490,
      taxRateBp: 1200,
      stockKind: "volume",
      pourSizeMl: 750,
      stockItemId: kegPilsener.id,
    }),
    createProduct({
      id: "product-pilsener-1000",
      sku: "DRAFT-PILS-1000",
      barcode: "7501000000003",
      name: "KUTANA Pilsener 1L",
      categoryId: "category-draft-beer",
      priceCents: 620,
      taxRateBp: 1200,
      stockKind: "volume",
      pourSizeMl: 1000,
      stockItemId: kegPilsener.id,
    }),
    createProduct({
      id: "product-session-ipa-500",
      sku: "DRAFT-IPA-500",
      barcode: "7501000000004",
      name: "KUTANA Session IPA 500ml",
      categoryId: "category-draft-beer",
      priceCents: 400,
      taxRateBp: 1200,
      stockKind: "volume",
      pourSizeMl: 500,
      stockItemId: kegSessionIpa.id,
    }),
    createProduct({
      id: "product-session-ipa-750",
      sku: "DRAFT-IPA-750",
      barcode: "7501000000005",
      name: "KUTANA Session IPA 750ml",
      categoryId: "category-draft-beer",
      priceCents: 560,
      taxRateBp: 1200,
      stockKind: "volume",
      pourSizeMl: 750,
      stockItemId: kegSessionIpa.id,
    }),
    createProduct({
      id: "product-stout-bottle",
      sku: "BOTTLE-STOUT-330",
      barcode: "7501000000006",
      name: "KUTANA Stout 330ml Bottle",
      categoryId: "category-bottled-beer",
      priceCents: 380,
      taxRateBp: 1200,
      stockKind: "unit",
      stockItemId: bottledStout.id,
    }),
    createProduct({
      id: "product-nachos",
      sku: "FOOD-NACHOS",
      name: "Loaded Nachos",
      categoryId: "category-food",
      priceCents: 650,
      taxRateBp: 1200,
      stockKind: "unit",
    }),
    createProduct({
      id: "product-empanadas",
      sku: "FOOD-EMPANADAS",
      name: "Beef Empanadas (3pc)",
      categoryId: "category-food",
      priceCents: 550,
      taxRateBp: 1200,
      stockKind: "unit",
    }),
  ];

  const table1 = createTable({ id: "table-1", label: "Table 1" });
  const table2 = createTable({ id: "table-2", label: "Table 2" });
  const table3 = createTable({ id: "table-3", label: "Table 3" });

  let openOrder: Order = createOrder({ id: "order-open-1", tableId: table1.id });
  openOrder = addLineItem(openOrder, {
    productId: "product-pilsener-500",
    nameSnapshot: "KUTANA Pilsener 500ml",
    unitPriceCents: 350,
    quantity: 2,
    taxRateBp: 1200,
    pourSizeMl: 500,
  });
  openOrder = addLineItem(openOrder, {
    productId: "product-nachos",
    nameSnapshot: "Loaded Nachos",
    unitPriceCents: 650,
    quantity: 1,
    taxRateBp: 1200,
  });

  const tables: Table[] = [occupyTable(table1, openOrder.id), table2, table3];

  return { categories, stockItems, products, tables, openOrder };
}
