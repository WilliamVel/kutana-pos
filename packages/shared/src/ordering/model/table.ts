import { createUuid } from "../../platform/uuid.js";
export type TableStatus = "free" | "active" | "needs_check" | "paid" | "retired";

export interface Table {
  readonly id: string;
  readonly label: string;
  readonly status: TableStatus;
  readonly currentOrderId: string | null;
  readonly version: number;
}

export function createTable(input: { label: string; id?: string }): Table {
  return {
    id: input.id ?? createUuid(),
    label: input.label,
    status: "free",
    currentOrderId: null,
    version: 1,
  };
}

export function occupyTable(table: Table, orderId: string): Table {
  return { ...table, status: "active", currentOrderId: orderId, version: table.version + 1 };
}

export function withTableStatus(table: Table, status: TableStatus): Table {
  return { ...table, status, version: table.version + 1 };
}
