import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { BillingCoreModule } from "./billing/billing-core.module.js";
import { PostgresModule } from "./infrastructure/postgres/postgres.module.js";
import { OrderingModule } from "./ordering/ordering.module.js";

/** Root application module; domain modules are added in later milestones. */
@Module({
  imports: [PostgresModule, BillingCoreModule, OrderingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
