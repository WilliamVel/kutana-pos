import { describe, expect, it } from "vitest";
import { discoverMigrations } from "./migration-runner.js";

describe("migration discovery", () => {
  it("returns numbered SQL migrations in deterministic order", () => {
    expect(discoverMigrations("migrations").map((migration) => migration.name)).toEqual([
      "001_initial_schema.sql",
      "002_stock_movement_ref_id_text.sql",
      "003_catalog_inventory_reference_ids_text.sql",
      "004_ordering_reference_ids_text.sql",
      "005_billing_reference_ids_text.sql",
      "006_customer_reference_ids_text.sql",
      "007_personal_account_reference_ids_text.sql",
      "008_customer_debt_ledger_shape.sql",
      "009_payment_reference_ids_text.sql",
    ]);
  });
});
