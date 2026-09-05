import { join } from "node:path";
import { Pool } from "pg";
import { migrate, rollback } from "./migration-runner.js";
import { postgresConfig } from "../infrastructure/postgres/postgres-config.js";

const migrationsDirectory = join(process.cwd(), "migrations");
const pool = new Pool(postgresConfig());

async function main(): Promise<void> {
  try {
    if (process.argv[2] === "rollback") await rollback(pool, migrationsDirectory);
    else if (process.argv[2] === "apply") await migrate(pool, migrationsDirectory);
    else throw new Error("Usage: migration-cli.ts <apply|rollback>");
  } finally {
    await pool.end();
  }
}

void main();
