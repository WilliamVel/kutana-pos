import { describe, expect, it, vi } from "vitest";
import { assertPostgresSchema } from "./postgres-schema.js";

describe("PostgreSQL schema guard", () => {
  it("does nothing when schema selection is absent", async () => {
    const pool = { query: vi.fn() };

    await expect(assertPostgresSchema(pool, undefined)).resolves.toBeUndefined();
    expect(pool.query).not.toHaveBeenCalled();
  });

  it("accepts an existing schema when it is the effective current schema", async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({ rows: [{ schema_exists: true, current_schema: "kutana_test" }] }),
    };

    await expect(assertPostgresSchema(pool, "kutana_test")).resolves.toBeUndefined();
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("current_schema()"), ["kutana_test"]);
  });

  it("fails closed when the selected schema does not exist", async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({ rows: [{ schema_exists: false, current_schema: "public" }] }),
    };

    await expect(assertPostgresSchema(pool, "kutana_test")).rejects.toThrow(
      "Configured PostgreSQL schema does not exist: kutana_test",
    );
  });

  it("fails when PostgreSQL falls back to a different current schema", async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({ rows: [{ schema_exists: true, current_schema: "public" }] }),
    };

    await expect(assertPostgresSchema(pool, "kutana_test")).rejects.toThrow(
      "Configured PostgreSQL schema is not effective: requested kutana_test, current public",
    );
  });
});
