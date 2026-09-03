import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { PostgresPool } from "./infrastructure/postgres/postgres-pool.js";

/** Root application module; domain modules are added in later milestones. */
@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, PostgresPool],
  exports: [PostgresPool],
})
export class AppModule {}
