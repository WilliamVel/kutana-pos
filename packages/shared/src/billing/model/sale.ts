import { createUuid } from "../../platform/uuid.js";
/**
 * A completed Sale: immutable once created. `publicUuid` is the stable,
 * unique, public identifier persisted permanently as the future SRI
 * lookup key (out of scope for v1 build, but the seam must exist now).
 */
export interface Sale {
  readonly id: string;
  readonly publicUuid: string;
  readonly orderId: string;
  readonly completedAt: string;
  readonly totalCents: number;
  readonly taxTotalCents: number;
  readonly customerId: string | null;
}

export function createSale(input: {
  orderId: string;
  totalCents: number;
  taxTotalCents: number;
  customerId?: string | null;
  completedAt?: string;
  id?: string;
  publicUuid?: string;
}): Sale {
  return {
    id: input.id ?? createUuid(),
    publicUuid: input.publicUuid ?? createUuid(),
    orderId: input.orderId,
    completedAt: input.completedAt ?? new Date().toISOString(),
    totalCents: input.totalCents,
    taxTotalCents: input.taxTotalCents,
    customerId: input.customerId ?? null,
  };
}
