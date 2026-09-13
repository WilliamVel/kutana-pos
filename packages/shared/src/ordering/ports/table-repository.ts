import type { Table } from "../model/table.js";

/**
 * Port contract only — implementations live in adapters (mock/HTTP/Postgres).
 *
 * NOTE: this port was not enumerated in task 6.5's original port list (an
 * oversight — `Table` already existed as a model but had no repository).
 * It is added here in PR6 because the all-orders view (task 10.4) needs to
 * enumerate every table to build its list; `OrderRepository.findByTable`
 * alone cannot answer "which tables exist". Follows the exact same shape
 * as the sibling ports (see `payments/ports/payment-repository.ts` for a
 * prior example of a port added outside the original 6.5 enumeration).
 */
export interface TableRepository {
  listAll(): Promise<Table[]>;
  findById(id: string): Promise<Table | null>;
  /** Throws ConflictError<Table> if the stored version !== expectedVersion. */
  save(table: Table, expectedVersion: number): Promise<Table>;
  /** Removes a table only when it is free and has no active order. */
  deleteFree(tableId: string, expectedVersion: number): Promise<void>;
}
