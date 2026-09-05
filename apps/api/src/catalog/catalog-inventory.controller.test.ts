import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { describe, expect, it, vi } from "vitest";
import type { Category } from "@kutana/shared/catalog/model/category.js";
import type { Product } from "@kutana/shared/catalog/model/product.js";
import type { StockItem } from "@kutana/shared/inventory/model/stock-item.js";
import type { StockMovement } from "@kutana/shared/inventory/model/stock-movement.js";
import { PostgresPool } from "../infrastructure/postgres/postgres-pool.js";
import { PostgresStockRepository } from "../inventory/adapters/postgres/stock-repository.js";
import { PostgresCategoryRepository } from "./adapters/postgres/category-repository.js";
import { PostgresProductRepository } from "./adapters/postgres/product-repository.js";
import { CatalogInventoryController } from "./catalog-inventory.controller.js";
import { CatalogInventoryModule } from "./catalog-inventory.module.js";

const category: Category = {
  id: "category-original",
  name: "Bebidas",
  sortOrder: 1,
};

const product: Product = {
  id: "product-original",
  sku: "sku-1",
  barcode: "barcode-1",
  name: "Agua",
  categoryId: "category-1",
  priceCents: 1200,
  costPriceCents: 600,
  taxRateBp: 1900,
  description: null,
  imageUrl: null,
  lowStockLevel: 5,
  stockKind: "unit",
  pourSizeMl: null,
  stockItemId: "stock-1",
  active: true,
  version: 2,
};

const stockItem: StockItem = {
  id: "stock-original",
  name: "Agua stock",
  kind: "unit",
  unit: "ea",
  quantity: 4,
  lowStockLevel: 5,
  version: 3,
};

const movement: StockMovement = {
  id: "movement-1",
  stockItemId: "stock-original",
  delta: -1,
  reason: "sale",
  refType: "order",
  refId: "order-1",
  occurredAt: "2025-01-01T00:00:00.000Z",
};

describe("CatalogInventoryController", () => {
  function controllerWithMocks() {
    const categories = {
      findById: vi.fn(),
      listAll: vi.fn(),
      save: vi.fn(),
    };
    const products = {
      findById: vi.fn(),
      findBySku: vi.fn(),
      findByBarcode: vi.fn(),
      listByCategory: vi.fn(),
      save: vi.fn(),
    };
    const stock = {
      findById: vi.fn(),
      listLowStock: vi.fn(),
      listMovements: vi.fn(),
      recordMovement: vi.fn(),
    };

    return {
      controller: new CatalogInventoryController(
        categories as unknown as PostgresCategoryRepository,
        products as unknown as PostgresProductRepository,
        stock as unknown as PostgresStockRepository,
      ),
      categories,
      products,
      stock,
    };
  }

  it("delegates category list and merges the route id on save", async () => {
    const { controller, categories } = controllerWithMocks();
    categories.listAll.mockResolvedValue([category]);
    categories.save.mockResolvedValue({ ...category, id: "category-route" });

    await expect(controller.listCategories()).resolves.toEqual([category]);
    await controller.saveCategory("category-route", category);

    expect(categories.listAll).toHaveBeenCalledOnce();
    expect(categories.save).toHaveBeenCalledWith({ ...category, id: "category-route" });
  });

  it("delegates category lookup by id", async () => {
    const { controller, categories } = controllerWithMocks();
    categories.findById.mockResolvedValue(category);

    await expect(controller.findCategoryById("category-1")).resolves.toEqual(category);

    expect(categories.findById).toHaveBeenCalledWith("category-1");
  });

  it("finds products by sku and barcode", async () => {
    const { controller, products } = controllerWithMocks();
    products.findBySku.mockResolvedValue(product);
    products.findByBarcode.mockResolvedValue(product);

    await expect(controller.findProductBySku("sku-1")).resolves.toEqual(product);
    await expect(controller.findProductByBarcode("barcode-1")).resolves.toEqual(product);

    expect(products.findBySku).toHaveBeenCalledWith("sku-1");
    expect(products.findByBarcode).toHaveBeenCalledWith("barcode-1");
  });

  it("parses includeInactive true, false, and missing when listing products by category", async () => {
    const { controller, products } = controllerWithMocks();
    products.listByCategory.mockResolvedValue([product]);

    await controller.listProductsByCategory("category-1", "true");
    await controller.listProductsByCategory("category-1", "false");
    await controller.listProductsByCategory("category-1");

    expect(products.listByCategory).toHaveBeenNthCalledWith(1, "category-1", { includeInactive: true });
    expect(products.listByCategory).toHaveBeenNthCalledWith(2, "category-1", { includeInactive: false });
    expect(products.listByCategory).toHaveBeenNthCalledWith(3, "category-1", { includeInactive: false });
  });

  it("merges the route id and expected version when saving a product", async () => {
    const { controller, products } = controllerWithMocks();
    products.save.mockResolvedValue({ ...product, id: "product-route" });

    await controller.saveProduct("product-route", { product, expectedVersion: 7 });

    expect(products.save).toHaveBeenCalledWith({ ...product, id: "product-route" }, 7);
  });

  it("delegates stock low-stock, movement listing, and recordMovement", async () => {
    const { controller, stock } = controllerWithMocks();
    stock.listLowStock.mockResolvedValue([stockItem]);
    stock.listMovements.mockResolvedValue([movement]);
    stock.recordMovement.mockResolvedValue(stockItem);

    await expect(controller.listLowStock()).resolves.toEqual([stockItem]);
    await expect(controller.listStockMovements("stock-original")).resolves.toEqual([movement]);
    await controller.recordStockMovement({ stockItem, movement, expectedVersion: 3 });

    expect(stock.listLowStock).toHaveBeenCalledOnce();
    expect(stock.listMovements).toHaveBeenCalledWith("stock-original");
    expect(stock.recordMovement).toHaveBeenCalledWith(stockItem, movement, 3);
  });

  it("compiles the catalog/inventory module with an overridden Postgres pool", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [CatalogInventoryModule] })
      .overrideProvider(PostgresPool)
      .useValue({ query: vi.fn(), connect: vi.fn() })
      .compile();

    expect(moduleRef.get(CatalogInventoryController)).toBeInstanceOf(CatalogInventoryController);

    await moduleRef.close();
  });
});
