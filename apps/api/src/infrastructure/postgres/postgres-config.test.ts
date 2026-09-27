import { describe, expect, it } from "vitest";
import { postgresConfig } from "./postgres-config.js";

describe("postgres configuration", () => {
  it("uses DATABASE_URL when provided", () => {
    expect(postgresConfig({ DATABASE_URL: "postgresql://dev:dev@localhost:5432/kutana" })).toEqual({
      connectionString: "postgresql://dev:dev@localhost:5432/kutana",
    });
    expect(postgresConfig({
      DATABASE_URL: "postgresql://dev:dev@localhost:5432/kutana",
      POSTGRES_SCHEMA: "kutana_test",
    })).toEqual({
      connectionString: "postgresql://dev:dev@localhost:5432/kutana",
      options: "-c search_path=kutana_test",
    });
  });

  it("provides safe local defaults", () => {
    expect(postgresConfig({})).toEqual({
      host: "localhost", port: 5432, database: "kutana", user: "kutana", password: "kutana_dev",
    });
  });

  it("configures the API with a strict selected schema search path", () => {
    expect(postgresConfig({ POSTGRES_SCHEMA: "kutana_test" })).toMatchObject({
      options: "-c search_path=kutana_test",
    });
  });

  it("configures migrations with public available for extension resolution", () => {
    expect(postgresConfig({ POSTGRES_SCHEMA: "kutana_test" }, "migration")).toMatchObject({
      options: "-c search_path=kutana_test,public",
    });
  });

  it("rejects unsafe schema identifiers before building either connection config", () => {
    expect(() => postgresConfig({ POSTGRES_SCHEMA: "kutana_test;DROP SCHEMA public" })).toThrow(
      "POSTGRES_SCHEMA must be a PostgreSQL identifier",
    );
    expect(() => postgresConfig({
      DATABASE_URL: "postgresql://dev:dev@localhost:5432/kutana",
      POSTGRES_SCHEMA: "kutana_test;DROP SCHEMA public",
    }, "migration")).toThrow("POSTGRES_SCHEMA must be a PostgreSQL identifier");
  });
});
