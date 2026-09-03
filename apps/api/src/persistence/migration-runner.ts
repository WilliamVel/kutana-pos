import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { Pool, PoolClient } from "pg";

export interface Migration {
  readonly name: string;
  readonly sql: string;
  readonly checksum: string;
  readonly path: string;
}

export function discoverMigrations(directory: string): Migration[] {
  return readdirSync(directory)
    .filter((name) => /^\d+_[a-z0-9_]+\.sql$/.test(name))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
    .map((name) => {
      const path = join(directory, name);
      const sql = readFileSync(path, "utf8");
      return { name, sql, checksum: createHash("sha256").update(sql).digest("hex"), path };
    });
}

export async function migrate(pool: Pool, directory: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now(), checksum text NOT NULL
    )`);
    const applied = await client.query<{ version: string; checksum: string }>(
      "SELECT version, checksum FROM schema_migrations ORDER BY version",
    );
    const appliedByName = new Map(applied.rows.map((row) => [row.version, row.checksum]));
    for (const migration of discoverMigrations(directory)) {
      const existing = appliedByName.get(migration.name);
      if (existing) {
        if (existing !== migration.checksum) throw new Error(`Migration checksum mismatch: ${migration.name}`);
        continue;
      }
      await client.query(migration.sql);
      await client.query("INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)", [migration.name, migration.checksum]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function rollback(pool: Pool, directory: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ version: string }>("SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1");
    const latest = result.rows[0];
    if (latest) {
      const migration = discoverMigrations(directory).find((item) => item.name === latest.version);
      if (!migration) throw new Error(`Applied migration file is missing: ${latest.version}`);
      throw new Error(`Rollback is unavailable for forward-only migration ${basename(migration.path)}`);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type MigrationClient = Pool | PoolClient;
