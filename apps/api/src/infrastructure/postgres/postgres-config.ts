import type { PoolConfig } from "pg";

export type Environment = Readonly<Record<string, string | undefined>>;

export function postgresConfig(env: Environment = process.env): PoolConfig {
  if (env.DATABASE_URL) return { connectionString: env.DATABASE_URL };
  return {
    host: env.POSTGRES_HOST ?? "localhost",
    port: Number(env.POSTGRES_PORT ?? 5432),
    database: env.POSTGRES_DB ?? "kutana",
    user: env.POSTGRES_USER ?? "kutana",
    password: env.POSTGRES_PASSWORD ?? "kutana_dev",
  };
}
