import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { discoverMigrations } from "./migration-runner.js";

const migrationDirectory = existsSync(join(process.cwd(), "migrations"))
  ? join(process.cwd(), "migrations")
  : join(process.cwd(), "apps/api/migrations");

describe("migration discovery", () => {
  it("returns numbered SQL migrations in deterministic order", () => {
    expect(discoverMigrations(migrationDirectory).map((migration) => migration.name)).toEqual([
      "001_initial_schema.sql",
      "002_stock_movement_ref_id_text.sql",
      "003_catalog_inventory_reference_ids_text.sql",
      "004_ordering_reference_ids_text.sql",
      "005_billing_reference_ids_text.sql",
      "006_customer_reference_ids_text.sql",
      "007_personal_account_reference_ids_text.sql",
      "008_customer_debt_ledger_shape.sql",
      "009_payment_reference_ids_text.sql",
      "010_allow_330ml_pour_size.sql",
      "011_seed_kutana_menu_catalog.sql",
      "012_allow_draft_line_item_deletion.sql",
      "013_payment_methods_table.sql",
      "014_auth_refresh_tokens.sql",
      "015_auth_users.sql",
      "016_payment_closure_sales_history.sql",
      "017_retired_tables.sql",
      "018_pending_debt_query_indexes.sql",
      "019_unique_table_labels_case_insensitive.sql",
      "020_kombucha_unit_catalog.sql",
      "021_sales_analytics_completed_at_index.sql",
      "022_zero_tax_catalog.sql",
    ]);
  });

  it("keeps migration 016 reference columns compatible with earlier text identifiers", () => {
    const sql = readFileSync(join(migrationDirectory, "016_payment_closure_sales_history.sql"), "utf8");

    expect(sql).toContain("ADD COLUMN table_id text REFERENCES restaurant_tables(id)");
    expect(sql).toContain("order_line_item_id text");
    expect(sql).toContain("product_id text NOT NULL");
    expect(sql).toContain("customer_id text REFERENCES customers(id)");
    expect(sql).toContain("account_id text");
    expect(sql).toContain("id uuid PRIMARY KEY");
    expect(sql).toContain("sale_id uuid NOT NULL REFERENCES sales(id)");
    expect(sql).not.toContain("table_id uuid REFERENCES restaurant_tables(id)");
    expect(sql).not.toContain("order_line_item_id uuid");
    expect(sql).not.toContain("customer_id uuid REFERENCES customers(id)");
  });
});
