import { ConflictError } from "@kutana/shared/errors/conflict-error.js";
import type { Table } from "@kutana/shared/ordering/model/table.js";
import type { TableRepository } from "@kutana/shared/ordering/ports/table-repository.js";
import { ConflictTrigger } from "./conflict-trigger.js";
import { simulateLatency } from "./simulate-latency.js";

/** In-memory `TableRepository` for milestone 1. */
export class MockTableRepository implements TableRepository {
  private readonly tablesById = new Map<string, Table>();
  readonly conflictTrigger = new ConflictTrigger();

  async listAll(): Promise<Table[]> {
    return simulateLatency(() => [...this.tablesById.values()]);
  }

  async findById(id: string): Promise<Table | null> {
    return simulateLatency(() => this.tablesById.get(id) ?? null);
  }

  async save(table: Table, expectedVersion: number): Promise<Table> {
    return simulateLatency(() => {
      const stored = this.tablesById.get(table.id) ?? null;

      if (this.conflictTrigger.consumeForcedConflict()) {
        throw new ConflictError<Table>("Forced conflict (test/demo trigger)", stored ?? table);
      }

      if (stored && stored.version !== expectedVersion) {
        throw new ConflictError<Table>(
          `Table ${table.id} version conflict: expected ${expectedVersion}, stored ${stored.version}`,
          stored,
        );
      }

      const next: Table = { ...table, version: expectedVersion + 1 };
      this.tablesById.set(table.id, next);
      return next;
    });
  }
}
