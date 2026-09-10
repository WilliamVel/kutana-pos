import { createUuid } from "../../platform/uuid.js";

export const SALE_CURRENCY = "USD" as const;
export type SaleStatus = "paid" | "pending";

export interface SaleItemSnapshot {
  readonly id: string;
  readonly saleId: string;
  readonly orderLineItemId?: string;
  readonly productId: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly subtotalCents: number;
  readonly taxCents: number;
  readonly discountCents: number;
  readonly totalCents: number;
  readonly accountId?: string;
  readonly customerId?: string;
}

export interface SaleSettlementSnapshot {
  readonly id: string;
  readonly saleId: string;
  readonly methodCode: string;
  readonly amountCents: number;
  readonly tenderedCents: number | null;
  readonly changeCents: number | null;
  readonly settledAt: string;
  readonly accountId?: string;
  readonly customerId?: string;
}

/** A completed Sale: an immutable, auditable closure snapshot. */
export interface Sale {
  readonly id: string;
  readonly publicUuid: string;
  readonly orderId: string;
  readonly completedAt: string;
  readonly currencyCode: typeof SALE_CURRENCY;
  readonly subtotalCents: number;
  readonly taxTotalCents: number;
  readonly discountTotalCents: number;
  readonly totalCents: number;
  readonly paidCents: number;
  readonly pendingCents: number;
  readonly status: SaleStatus;
  readonly tableId: string | null;
  readonly openedAt: string | null;
  readonly closedAt: string;
  readonly closedByUserId: string | null;
  readonly customerId: string | null;
  readonly items: readonly SaleItemSnapshot[];
  readonly settlements: readonly SaleSettlementSnapshot[];
}

export function createSale(input: {
  orderId: string;
  totalCents: number;
  taxTotalCents: number;
  subtotalCents?: number;
  discountTotalCents?: number;
  paidCents?: number;
  pendingCents?: number;
  status?: SaleStatus;
  currencyCode?: typeof SALE_CURRENCY;
  tableId?: string | null;
  openedAt?: string | null;
  closedAt?: string;
  closedByUserId?: string | null;
  customerId?: string | null;
  items?: readonly SaleItemSnapshot[];
  settlements?: readonly SaleSettlementSnapshot[];
  completedAt?: string;
  id?: string;
  publicUuid?: string;
}): Sale {
  if (input.currencyCode !== undefined && input.currencyCode !== SALE_CURRENCY) {
    throw new Error(`Unsupported sale currency: ${input.currencyCode}`);
  }
  const paidCents = input.paidCents ?? (input.status === "pending" ? 0 : input.totalCents);
  const pendingCents = input.pendingCents ?? input.totalCents - paidCents;
  return {
    id: input.id ?? createUuid(),
    publicUuid: input.publicUuid ?? createUuid(),
    orderId: input.orderId,
    completedAt: input.completedAt ?? new Date().toISOString(),
    currencyCode: SALE_CURRENCY,
    subtotalCents: input.subtotalCents ?? input.totalCents - input.taxTotalCents,
    taxTotalCents: input.taxTotalCents,
    discountTotalCents: input.discountTotalCents ?? 0,
    totalCents: input.totalCents,
    paidCents,
    pendingCents,
    status: input.status ?? (pendingCents > 0 ? "pending" : "paid"),
    tableId: input.tableId ?? null,
    openedAt: input.openedAt ?? null,
    closedAt: input.closedAt ?? input.completedAt ?? new Date().toISOString(),
    closedByUserId: input.closedByUserId ?? null,
    customerId: input.customerId ?? null,
    items: Object.freeze([...(input.items ?? [])]),
    settlements: Object.freeze([...(input.settlements ?? [])]),
  };
}
