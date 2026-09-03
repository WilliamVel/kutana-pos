import { describe, expect, it } from "vitest";
import { discoverMigrations } from "./migration-runner.js";

describe("migration discovery", () => {
  it("returns numbered SQL migrations in deterministic order", () => {
    expect(discoverMigrations("migrations").map((migration) => migration.name)).toEqual([
      "001_initial_schema.sql",
    ]);
  });
});
