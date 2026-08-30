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
  const lineItem = createLineItem({ orderId: order.id, ...input });
  return { ...order, lineItems: [...order.lineItems, lineItem], version: order.version + 1 };
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
