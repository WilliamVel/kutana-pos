import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Pool } from "pg";
import { postgresConfig } from "./postgres-config.js";

@Injectable()
export class PostgresPool extends Pool implements OnModuleDestroy {
  constructor() {
    super(postgresConfig());
  }

  async onModuleDestroy(): Promise<void> {
    await this.end();
  }
}
