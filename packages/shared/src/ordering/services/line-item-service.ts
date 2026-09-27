import { ValidationError } from "../../errors/domain-error.js";
import { createLineItem, type LineItem } from "../model/line-item.js";
import { isOrderModifiable, type Order } from "../model/order.js";

function assertModifiable(order: Order): void {
  if (!isOrderModifiable(order)) {
    throw new ValidationError(`Order ${order.id} is paid and can no longer be modified`);
  }
}

/**
 * Appends a new, immutable LineItem to the order. Never mutates or removes
 * any existing line item — the returned order's `lineItems` array is a new
 * array with the previous entries intact by reference.
 */
export function addLineItem(
  order: Order,
  input: {
    productId: string;
    nameSnapshot: string;
    unitPriceCents: number;
    quantity: number;
    taxRateBp: number;
    pourSizeMl?: number | null;
  },
): Order {
  assertModifiable(order);
  const nextPosition = order.lineItems.reduce(
    (max, item, index) => Math.max(max, item.position ?? index),
    -1,
  ) + 1;
  const lineItem = createLineItem({ orderId: order.id, ...input, position: nextPosition });
  return { ...order, lineItems: [...order.lineItems, lineItem], version: order.version + 1 };
}

/**
 * Removes an existing LineItem from a still-modifiable (unpaid) order. This
 * is a genuine deletion and is allowed ONLY before payment — a pre-sale
 * ticket is a draft, not yet an audit record, so a mistakenly added item
 * can simply be taken back off. Once the order is paid `isOrderModifiable`
 * is false and corrections MUST go through `addAdjustmentLine` instead,
 * which preserves the immutable at-sale-time trail.
 */
export function removeLineItem(order: Order, lineItemId: string): Order {
  assertModifiable(order);
  const target = order.lineItems.find((item) => item.id === lineItemId);
  if (!target) {
    throw new ValidationError(`Cannot remove unknown line item ${lineItemId}`);
  }
  return {
    ...order,
    lineItems: order.lineItems.filter((item) => item.id !== lineItemId),
    version: order.version + 1,
  };
}

/**
 * Removes one unit from a line without mutating its immutable persisted record.
 * A single-unit line keeps the existing whole-line removal semantics.
 */
export function removeLineItemUnit(order: Order, lineItemId: string): Order {
  assertModifiable(order);
  const target = order.lineItems.find((item) => item.id === lineItemId);
  if (!target) {
    throw new ValidationError(`Cannot remove unknown line item ${lineItemId}`);
  }
  if (target.quantity <= 1) {
    return removeLineItem(order, lineItemId);
  }

  const replacement = createLineItem({
    orderId: target.orderId,
    productId: target.productId,
    nameSnapshot: target.nameSnapshot,
    unitPriceCents: target.unitPriceCents,
    quantity: target.quantity - 1,
    taxRateBp: target.taxRateBp,
    pourSizeMl: target.pourSizeMl,
    isAdjustment: target.isAdjustment,
    createdAt: target.createdAt,
    position: target.position ?? order.lineItems.indexOf(target),
  });
  return {
    ...order,
    lineItems: order.lineItems.map((item) => item.id === lineItemId ? replacement : item),
    version: order.version + 1,
  };
}

/**
 * The ONLY sanctioned way to correct an existing LineItem: appends a new
 * `isAdjustment: true` line item. The original LineItem referenced by
 * `correctsLineItemId` is never touched — it remains in `lineItems`
 * unchanged, preserving a full immutable audit trail.
 */
export function addAdjustmentLine(
  order: Order,
  input: {
    correctsLineItemId: string;
    productId: string;
    nameSnapshot: string;
    unitPriceCents: number;
    quantity: number;
    taxRateBp: number;
  },
): Order {
  assertModifiable(order);
  const target = order.lineItems.find((item) => item.id === input.correctsLineItemId);
  if (!target) {
    throw new ValidationError(`Cannot adjust unknown line item ${input.correctsLineItemId}`);
  }

  const adjustment: LineItem = createLineItem({
    orderId: order.id,
    productId: input.productId,
    nameSnapshot: input.nameSnapshot,
    unitPriceCents: input.unitPriceCents,
    quantity: input.quantity,
    taxRateBp: input.taxRateBp,
    isAdjustment: true,
  });

  return { ...order, lineItems: [...order.lineItems, adjustment], version: order.version + 1 };
}
