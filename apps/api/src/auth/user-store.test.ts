import { afterEach, describe, expect, it } from "vitest";
import { PostgresAuthUserStore } from "./user-store.js";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

class FakePool {
  readonly queries: Array<{ readonly sql: string; readonly params: readonly unknown[] }> = [];
  rows: readonly unknown[] = [];

  async query<T>(sql: string, params: readonly unknown[] = []): Promise<{ rows: T[] }> {
    this.queries.push({ sql, params });
    return { rows: this.rows as T[] };
  }
}

describe("PostgresAuthUserStore", () => {
  it("creates persisted users with role and soft-deactivates instead of deleting", async () => {
    const pool = new FakePool();
    const store = new PostgresAuthUserStore(pool as never);
    pool.rows = [
      {
        id: "user-1",
        display_name: "Ollie",
        role: "operator",
        pin_hash: "pin-hash",
        deactivated_at: null,
      },
    ];

    await store.createUser({ displayName: "Ollie", role: "operator", pinHash: "pin-hash" });
    await store.deactivateUser("user-1");

    const createQuery = pool.queries[0];
    const deactivateQuery = pool.queries[1];
    expect(createQuery).toBeDefined();
    expect(deactivateQuery).toBeDefined();
    expect(createQuery?.sql).toContain("INSERT INTO auth_users");
    expect(createQuery?.params.slice(1)).toEqual(["Ollie", "operator", "pin-hash"]);
    expect(deactivateQuery?.sql).toContain("UPDATE auth_users");
    expect(deactivateQuery?.sql).not.toContain("DELETE FROM auth_users");
  });

  it("bootstraps the first admin only from explicit environment hash inputs", async () => {
    process.env.AUTH_BOOTSTRAP_ADMIN_OPERATOR = "Ada";
    process.env.AUTH_BOOTSTRAP_ADMIN_PIN_HASH = "hashed-pin";
    const pool = new FakePool();
    const store = new PostgresAuthUserStore(pool as never);

    await store.findActiveByDisplayName("Ada");

    const bootstrapQuery = pool.queries[0];
    expect(bootstrapQuery).toBeDefined();
    expect(bootstrapQuery?.sql).toContain("WHERE NOT EXISTS (SELECT 1 FROM auth_users)");
    expect(bootstrapQuery?.params.slice(1)).toEqual(["Ada", "hashed-pin"]);
  });
});
