import type { PoolConfig } from "pg";

export type Environment = Readonly<Record<string, string | undefined>>;
export type PostgresConfigMode = "api" | "migration";

const POSTGRES_SCHEMA_PATTERN = /^[a-z_][a-z0-9_]*$/;
const POSTGRES_IDENTIFIER_MAX_LENGTH = 63;

export function validatePostgresSchema(schema: string): string {
  if (
    schema.length === 0 ||
    schema.length > POSTGRES_IDENTIFIER_MAX_LENGTH ||
    !POSTGRES_SCHEMA_PATTERN.test(schema)
  ) {
    throw new Error(
      "POSTGRES_SCHEMA must be a PostgreSQL identifier containing only lowercase letters, digits, and underscores",
    );
  }
  return schema;
}

export function postgresSchema(env: Environment = process.env): string | undefined {
  return env.POSTGRES_SCHEMA === undefined ? undefined : validatePostgresSchema(env.POSTGRES_SCHEMA);
}

export function postgresConfig(env: Environment = process.env, mode: PostgresConfigMode = "api"): PoolConfig {
  const schema = postgresSchema(env);
  const searchPath = schema === undefined ? undefined : mode === "migration" ? `${schema},public` : schema;

  if (env.DATABASE_URL) {
    return searchPath === undefined
      ? { connectionString: env.DATABASE_URL }
      : { connectionString: env.DATABASE_URL, options: `-c search_path=${searchPath}` };
  }

  return {
    host: env.POSTGRES_HOST ?? "localhost",
    port: Number(env.POSTGRES_PORT ?? 5432),
    database: env.POSTGRES_DB ?? "kutana",
    user: env.POSTGRES_USER ?? "kutana",
    password: env.POSTGRES_PASSWORD ?? "kutana_dev",
    ...(searchPath === undefined ? {} : { options: `-c search_path=${searchPath}` }),
  };
}
