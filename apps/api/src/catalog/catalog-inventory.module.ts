import { Module } from "@nestjs/common";
import { PostgresModule } from "../infrastructure/postgres/postgres.module.js";
import { PostgresStockRepository } from "../inventory/adapters/postgres/stock-repository.js";
import { PostgresCategoryRepository } from "./adapters/postgres/category-repository.js";
import { PostgresProductRepository } from "./adapters/postgres/product-repository.js";
import { CatalogInventoryController } from "./catalog-inventory.controller.js";

@Module({
  imports: [PostgresModule],
  controllers: [CatalogInventoryController],
  providers: [PostgresCategoryRepository, PostgresProductRepository, PostgresStockRepository],
})
export class CatalogInventoryModule {}
