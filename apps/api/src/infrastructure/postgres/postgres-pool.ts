import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Pool } from "pg";
import { assertPostgresSchema } from "./postgres-schema.js";
import { postgresConfig, postgresSchema } from "./postgres-config.js";

@Injectable()
export class PostgresPool extends Pool implements OnModuleDestroy, OnModuleInit {
  constructor() {
    super(postgresConfig(process.env, "api"));
  }

  async onModuleInit(): Promise<void> {
    await assertPostgresSchema(this, postgresSchema());
  }

  async onModuleDestroy(): Promise<void> {
    await this.end();
  }
}
