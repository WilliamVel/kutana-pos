import { ValidationError } from "../../errors/domain-error.js";

/**
 * Records payment responsibility for a single LineItem.
 *
 * `shareBp` is the line item's share expressed in basis points. In v1 it is
 * ALWAYS 10000 (100%), with exactly one Allocation per LineItem — this is
 * the fractional-splitting seam: enabling partial/shared-item splitting
 * later means allowing multiple Allocations per line item whose shareBp
 * values sum to 10000, WITHOUT changing LineItem, Order, or Ticket at all.
 * Splitting a bill = repointing an Allocation's ticketId. Nothing about the
 * LineItem itself is ever moved, copied, or mutated.
 */
export interface Allocation {
  readonly id: string;
  readonly lineItemId: string;
  readonly ticketId: string;
  readonly shareBp: number;
}

const FULL_SHARE_BP = 10_000;

export function createAllocation(input: {
  lineItemId: string;
  ticketId: string;
  shareBp?: number;
  id?: string;
}): Allocation {
  const shareBp = input.shareBp ?? FULL_SHARE_BP;
  if (shareBp !== FULL_SHARE_BP) {
    throw new ValidationError(
      `Allocation.shareBp must be ${FULL_SHARE_BP} (100%) in v1, received: ${shareBp}`,
    );
  }
  return {
    id: input.id ?? crypto.randomUUID(),
    lineItemId: input.lineItemId,
    ticketId: input.ticketId,
    shareBp,
  };
}

/**
 * Adds a new Allocation to an existing set, enforcing the v1 invariant that
 * exactly one Allocation may exist per LineItem. Rejects the operation if
 * an Allocation for the same lineItemId already exists — callers must
 * explicitly remove the old allocation first (see `removeAllocation`).
 */
export function addAllocation(existing: readonly Allocation[], next: Allocation): Allocation[] {
  const alreadyAllocated = existing.some((allocation) => allocation.lineItemId === next.lineItemId);
  if (alreadyAllocated) {
    throw new ValidationError(
      `LineItem ${next.lineItemId} already has an allocation; remove the existing allocation before adding a new one`,
    );
  }
  return [...existing, next];
}

export function removeAllocation(
  existing: readonly Allocation[],
  lineItemId: string,
): Allocation[] {
  return existing.filter((allocation) => allocation.lineItemId !== lineItemId);
}

/**
 * Repoints an existing Allocation's ticketId, preserving its shareBp.
 * This is the entire mechanism behind "splitting a bill".
 */
export function repointAllocation(
  existing: readonly Allocation[],
  lineItemId: string,
  toTicketId: string,
): Allocation[] {
  return existing.map((allocation) =>
    allocation.lineItemId === lineItemId ? { ...allocation, ticketId: toTicketId } : allocation,
  );
}
