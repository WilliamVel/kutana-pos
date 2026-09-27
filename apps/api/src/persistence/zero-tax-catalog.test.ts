import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationDirectory = existsSync(join(process.cwd(), "migrations"))
  ? join(process.cwd(), "migrations")
  : join(process.cwd(), "apps/api/migrations");
const migration = readFileSync(join(migrationDirectory, "022_zero_tax_catalog.sql"), "utf8");

describe("zero-tax catalog migration", () => {
  it("defaults new products to zero tax and updates only active catalog products", () => {
    expect(migration).toContain("ALTER COLUMN tax_rate_bp SET DEFAULT 0");
    expect(migration).toContain("WHERE active = true");
    expect(migration).toContain("SET tax_rate_bp = 0");
    expect(migration).not.toMatch(/UPDATE\s+line_items/i);
    expect(migration).not.toMatch(/UPDATE\s+sales/i);
  });
});
