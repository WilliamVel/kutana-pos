import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { AuthModule } from "./auth/auth.module.js";
import { BillingCoreModule } from "./billing/billing-core.module.js";
import { CatalogInventoryModule } from "./catalog/catalog-inventory.module.js";
import { PostgresModule } from "./infrastructure/postgres/postgres.module.js";
import { OrderingModule } from "./ordering/ordering.module.js";

/** Root application module; domain modules are added in later milestones. */
@Module({
  imports: [AuthModule, PostgresModule, BillingCoreModule, OrderingModule, CatalogInventoryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
