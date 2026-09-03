import { describe, expect, it } from "vitest";
import { postgresConfig } from "./postgres-config.js";

describe("postgres configuration", () => {
  it("uses DATABASE_URL when provided", () => {
    expect(postgresConfig({ DATABASE_URL: "postgresql://dev:dev@localhost:5432/kutana" })).toEqual({
      connectionString: "postgresql://dev:dev@localhost:5432/kutana",
    });
  });

  it("provides safe local defaults", () => {
    expect(postgresConfig({})).toEqual({
      host: "localhost", port: 5432, database: "kutana", user: "kutana", password: "kutana_dev",
    });
  });
});
