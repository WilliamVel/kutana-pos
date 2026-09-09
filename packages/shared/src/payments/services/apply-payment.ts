import { createUuid } from "../../platform/uuid.js";
import { ValidationError } from "../../errors/domain-error.js";
import {
  requiresTendered,
  type PaymentMethodCode,
  type PaymentMethodRegistry,
} from "../model/payment-method-registry.js";
import type { Payment, PaymentTarget } from "../model/payment.js";

/**
 * Records a new payment against a ticket. Whether a tendered amount is
 * accepted (and change computed) is driven entirely by the registry's
 * `requiresTendered` flag for the given method — never by branching on a
 * specific method code.
 */
export function applyPayment(
  registry: PaymentMethodRegistry,
  existing: readonly Payment[],
  input: {
    ticketId: string;
    target?: PaymentTarget;
    methodCode: PaymentMethodCode;
    amountCents: number;
    tenderedCents?: number;
    id?: string;
    recordedAt?: string;
  },
): Payment[] {
  const methodRequiresTendered = requiresTendered(registry, input.methodCode);

  if (!methodRequiresTendered && input.tenderedCents !== undefined) {
    throw new ValidationError(
      `Payment method ${input.methodCode} does not accept a tendered amount (requiresTendered=false)`,
    );
  }

  let tenderedCents: number | null = null;
  let changeCents: number | null = null;

  if (methodRequiresTendered && input.tenderedCents !== undefined) {
    const change = computeChange({
      remainingCents: input.amountCents,
      tenderedCents: input.tenderedCents,
    });
    tenderedCents = input.tenderedCents;
    changeCents = change.changeCents;
  }

  const payment: Payment = {
    id: input.id ?? createUuid(),
    target: input.target ?? { kind: "ticket", ticketId: input.ticketId },
    ticketId: input.ticketId,
    methodCode: input.methodCode,
    amountCents: input.amountCents,
    tenderedCents,
    changeCents,
    recordedAt: input.recordedAt ?? new Date().toISOString(),
  };

  return [...existing, payment];
}

export function paymentsTotal(payments: readonly Payment[]): number {
  return payments.reduce((sum, payment) => sum + payment.amountCents, 0);
}

/**
 * Computes change due for a tendered amount against a remaining balance.
 * `amountAppliedCents` is always the remaining balance (the payment amount
 * actually applied to the ticket); `changeCents` is whatever is handed back
 * to the customer. Rejects a tendered amount that does not cover the
 * remaining balance.
 */
export function computeChange(input: { remainingCents: number; tenderedCents: number }): {
  amountAppliedCents: number;
  changeCents: number;
} {
  if (input.tenderedCents < input.remainingCents) {
    throw new ValidationError(
      `Tendered amount ${input.tenderedCents} is less than the remaining balance ${input.remainingCents}`,
    );
  }
  return {
    amountAppliedCents: input.remainingCents,
    changeCents: input.tenderedCents - input.remainingCents,
  };
}
