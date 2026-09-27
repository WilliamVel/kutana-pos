import type { Pool } from "pg";

interface PostgresSchemaStatus {
  readonly schema_exists: boolean;
  readonly current_schema: string | null;
}

export async function assertPostgresSchema(pool: Pick<Pool, "query">, selectedSchema: string | undefined): Promise<void> {
  if (selectedSchema === undefined) return;

  const result = await pool.query<PostgresSchemaStatus>(
    `SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = $1) AS schema_exists,
            current_schema() AS current_schema`,
    [selectedSchema],
  );
  const status = result.rows[0];

  if (!status?.schema_exists) {
    throw new Error(`Configured PostgreSQL schema does not exist: ${selectedSchema}`);
  }
  if (status.current_schema !== selectedSchema) {
    throw new Error(
      `Configured PostgreSQL schema is not effective: requested ${selectedSchema}, current ${status.current_schema ?? "none"}`,
    );
  }
}
