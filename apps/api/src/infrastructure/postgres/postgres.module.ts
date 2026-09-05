import { Module } from "@nestjs/common";
import { PostgresPool } from "./postgres-pool.js";

@Module({
  providers: [PostgresPool],
  exports: [PostgresPool],
})
export class PostgresModule {}
