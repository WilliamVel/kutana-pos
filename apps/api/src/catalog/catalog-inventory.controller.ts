import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import type { Category } from "@kutana/shared/catalog/model/category.js";
import type { Product } from "@kutana/shared/catalog/model/product.js";
import type { StockItem } from "@kutana/shared/inventory/model/stock-item.js";
import type { StockMovement } from "@kutana/shared/inventory/model/stock-movement.js";
import { PostgresCategoryRepository } from "./adapters/postgres/category-repository.js";
import { PostgresProductRepository } from "./adapters/postgres/product-repository.js";
import { PostgresStockRepository } from "../inventory/adapters/postgres/stock-repository.js";

interface SaveProductDto {
  readonly product: Product;
  readonly expectedVersion: number;
}

interface RecordStockMovementDto {
  readonly stockItem: StockItem;
  readonly movement: StockMovement;
  readonly expectedVersion: number;
}

@Controller()
export class CatalogInventoryController {
  constructor(
    private readonly categories: PostgresCategoryRepository,
    private readonly products: PostgresProductRepository,
    private readonly stock: PostgresStockRepository,
  ) {}

  @Get("catalog/categories")
  listCategories(): Promise<Category[]> {
    return this.categories.listAll();
  }

  @Get("catalog/categories/:id")
  findCategoryById(@Param("id") id: string): Promise<Category | null> {
    return this.categories.findById(id);
  }

  @Put("catalog/categories/:id")
  saveCategory(@Param("id") id: string, @Body() body: Category): Promise<Category> {
    return this.categories.save({ ...body, id });
  }

  @Get("catalog/products/by-sku/:sku")
  findProductBySku(@Param("sku") sku: string): Promise<Product | null> {
    return this.products.findBySku(sku);
  }

  @Get("catalog/products/by-barcode/:barcode")
  findProductByBarcode(@Param("barcode") barcode: string): Promise<Product | null> {
    return this.products.findByBarcode(barcode);
  }

  @Get("catalog/products/:id")
  findProductById(@Param("id") id: string): Promise<Product | null> {
    return this.products.findById(id);
  }

  @Get("catalog/categories/:categoryId/products")
  listProductsByCategory(
    @Param("categoryId") categoryId: string,
    @Query("includeInactive") includeInactive?: string,
  ): Promise<Product[]> {
    const parsedIncludeInactive = includeInactive === "true";
    return this.products.listByCategory(categoryId, { includeInactive: parsedIncludeInactive });
  }

  @Put("catalog/products/:id")
  saveProduct(@Param("id") id: string, @Body() body: SaveProductDto): Promise<Product> {
    return this.products.save({ ...body.product, id }, body.expectedVersion);
  }

  @Get("inventory/stock-items/low-stock")
  listLowStock(): Promise<StockItem[]> {
    return this.stock.listLowStock();
  }

  @Get("inventory/stock-items/:id")
  findStockItemById(@Param("id") id: string): Promise<StockItem | null> {
    return this.stock.findById(id);
  }

  @Get("inventory/stock-items/:stockItemId/movements")
  listStockMovements(@Param("stockItemId") stockItemId: string): Promise<StockMovement[]> {
    return this.stock.listMovements(stockItemId);
  }

  @Post("inventory/stock-movements")
  recordStockMovement(@Body() body: RecordStockMovementDto): Promise<StockItem> {
    return this.stock.recordMovement(body.stockItem, body.movement, body.expectedVersion);
  }
}
