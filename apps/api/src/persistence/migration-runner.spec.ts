import { describe, expect, it } from "vitest";
import { discoverMigrations } from "./migration-runner.js";

describe("migration discovery", () => {
  it("returns numbered SQL migrations in deterministic order", () => {
    expect(discoverMigrations("migrations").map((migration) => migration.name)).toEqual([
      "001_initial_schema.sql",
      "002_stock_movement_ref_id_text.sql",
          "003_catalog_inventory_reference_ids_text.sql",
      "004_ordering_reference_ids_text.sql",
    ]);
  });
});
