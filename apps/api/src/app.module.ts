import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";

/**
 * Root application module. Domain modules (catalog, inventory, ordering,
 * billing, payments, reporting) are added in later phases.
 */
@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
