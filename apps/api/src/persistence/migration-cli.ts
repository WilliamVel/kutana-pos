import { join } from "node:path";
import { Pool } from "pg";
import { migrate, rollback } from "./migration-runner.js";
import { postgresConfig, postgresSchema } from "../infrastructure/postgres/postgres-config.js";
import { assertPostgresSchema } from "../infrastructure/postgres/postgres-schema.js";

const migrationsDirectory = join(process.cwd(), "migrations");
const pool = new Pool(postgresConfig(process.env, "migration"));

async function main(): Promise<void> {
  try {
    await assertPostgresSchema(pool, postgresSchema());
    if (process.argv[2] === "rollback") await rollback(pool, migrationsDirectory);
    else if (process.argv[2] === "apply") await migrate(pool, migrationsDirectory);
    else throw new Error("Usage: migration-cli.ts <apply|rollback>");
  } finally {
    await pool.end();
  }
}

void main();
