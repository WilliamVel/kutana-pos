import { createTable } from "@kutana/shared/ordering/model/table.js";
import { describe, expect, it } from "vitest";
import { MockTableRepository } from "./table-repository.js";

describe("MockTableRepository", () => {
  it("lists every saved table", async () => {
    const repository = new MockTableRepository();
    await repository.save(createTable({ id: "table-1", label: "Table 1" }), 0);
    await repository.save(createTable({ id: "table-2", label: "Table 2" }), 0);

    const tables = await repository.listAll();

    expect(tables.map((table) => table.id).sort()).toEqual(["table-1", "table-2"]);
  });

  it("finds a table by id, or returns null when absent", async () => {
    const repository = new MockTableRepository();
    await repository.save(createTable({ id: "table-1", label: "Table 1" }), 0);

    await expect(repository.findById("table-1")).resolves.toMatchObject({ label: "Table 1" });
    await expect(repository.findById("does-not-exist")).resolves.toBeNull();
  });

  it("rejects a stale version on save", async () => {
    const repository = new MockTableRepository();
    const table = await repository.save(createTable({ id: "table-1", label: "Table 1" }), 0);

    await expect(repository.save(table, table.version - 1)).rejects.toThrow(/version conflict/);
  });
});
