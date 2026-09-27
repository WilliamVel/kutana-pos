import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = existsSync(join(process.cwd(), "migrations"))
  ? join(process.cwd(), "migrations/020_kombucha_unit_catalog.sql")
  : join(process.cwd(), "apps/api/migrations/020_kombucha_unit_catalog.sql");
const migrationSql = readFileSync(migrationPath, "utf8");

describe("Kombucha unit catalog migration", () => {
  it("inserts one deterministic unit product at $5 and retires only the original volume variants", () => {
    expect(migrationSql).toContain(
      "('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4', 'MENU-KOMBUCHA-UNIT', NULL, 'Kombucha', '11111111-1111-4111-8111-111111111111', 500",
    );
    expect(migrationSql).toContain("low_stock_level, stock_kind, pour_size_ml, stock_item_id, active, version");
    expect(migrationSql).toContain("NULL, NULL, 'unit', NULL, NULL, true, 1)");
    expect(migrationSql).not.toContain("ON CONFLICT (sku) DO NOTHING");
    expect(migrationSql).toContain("SET active = false,\n    version = version + 1");
    expect(migrationSql).toContain(
      "WHERE active = true\n  AND sku IN ('MENU-KOMBUCHA-330', 'MENU-KOMBUCHA-500', 'MENU-KOMBUCHA-1000')",
    );
    expect(migrationSql).not.toMatch(/\bDELETE\s+FROM\s+products\b/i);
    expect(migrationSql).not.toMatch(/UPDATE\s+products[\s\S]*WHERE[\s\S]*sku\s+NOT\s+IN/i);
  });
});

// This is a deterministic SQL-shape regression test. It does not execute PostgreSQL;
// the existing adapter integration tests require an explicit DATABASE_URL.
