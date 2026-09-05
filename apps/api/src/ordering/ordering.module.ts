import { Module } from "@nestjs/common";
import { PostgresModule } from "../infrastructure/postgres/postgres.module.js";
import { PostgresOrderRepository } from "./adapters/postgres/order-repository.js";
import { PostgresTableRepository } from "./adapters/postgres/table-repository.js";
import { OrderEventsService } from "./order-events.service.js";
import { OrderingController } from "./ordering.controller.js";

@Module({
  imports: [PostgresModule],
  controllers: [OrderingController],
  providers: [PostgresOrderRepository, PostgresTableRepository, OrderEventsService],
})
export class OrderingModule {}
