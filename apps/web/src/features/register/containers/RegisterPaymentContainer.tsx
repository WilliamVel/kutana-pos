import { useEffect, useState } from "react";
import { createAllocation, type Allocation } from "@kutana/shared/billing/model/allocation.js";
import { createTicket, withStatus, type Ticket } from "@kutana/shared/billing/model/ticket.js";
import { ticketTotals } from "@kutana/shared/billing/services/split-allocation.js";
import type { Order } from "@kutana/shared/ordering/model/order.js";
import type { PaymentMethodCode } from "@kutana/shared/payments/model/payment-method-registry.js";
import type { Payment } from "@kutana/shared/payments/model/payment.js";
import {
  applyPayment,
  computeChange,
  paymentsTotal,
} from "@kutana/shared/payments/services/apply-payment.js";
import {
  useOrders,
  usePaymentMethods,
  usePayments,
  useTables,
  useTickets,
} from "../../../composition/PortsProvider.js";
import {
  RegisterPaymentPanel,
  type RegisterPaymentPanelLine,
} from "../components/RegisterPaymentPanel.js";

export interface RegisterPaymentContainerProps {
  readonly tableId: string;
  /**
   * Pays a SPECIFIC ticket (e.g. one of two tickets produced by the
   * split-bill screen). When omitted, falls back to the table's single
   * default ticket (auto-created the first time this screen opens for a
   * table with no ticket yet) — the pre-split-bill v1 behavior.
   */
  readonly ticketId?: string;
}

/**
 * Wires the register/payment screen to the domain. Totals and lines are
 * always derived from the REAL `Allocation` set read via
 * `TicketRepository.listAllocationsByOrder` — never fabricated as "every
 * line item belongs to this ticket" — so paying one ticket after a
 * split-bill move never corrupts the other ticket's allocations. Payment
 * method selection is driven entirely from `usePaymentMethods()` (the
 * registry), never a hardcoded list. Multiple partial payments accumulate
 * against the same ticket until its balance reaches zero (spec: "Payments
 * N:1 with Ticket").
 */
export function RegisterPaymentContainer({
  tableId,
  ticketId,
}: RegisterPaymentContainerProps): JSX.Element | null {
  const tables = useTables();
  const orders = useOrders();
  const tickets = useTickets();
  const paymentsPort = usePayments();
  const methodRegistry = usePaymentMethods();

  const [order, setOrder] = useState<Order | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedMethodCode, setSelectedMethodCode] = useState<string>(
    methodRegistry[0]?.code ?? "",
  );
  const [tenderedCents, setTenderedCents] = useState<number | null>(null);
  const [amountToPayCents, setAmountToPayCents] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      const table = await tables.findById(tableId);
      if (!table?.currentOrderId) return;
      const foundOrder = await orders.findByTable(tableId);
      if (cancelled || !foundOrder) return;
      setOrder(foundOrder);

      const existingTickets = await tickets.listByOrder(foundOrder.id);
      let orderAllocations = await tickets.listAllocationsByOrder(foundOrder.id);
      let activeTicket = ticketId
        ? (existingTickets.find((candidate) => candidate.id === ticketId) ?? null)
        : (existingTickets.find((candidate) => candidate.status !== "paid") ?? null);

      if (!activeTicket && !ticketId) {
        const newTicket = createTicket({ orderId: foundOrder.id, label: table.label });
        const newAllocations = foundOrder.lineItems.map((line) =>
          createAllocation({ lineItemId: line.id, ticketId: newTicket.id }),
        );
        activeTicket = await tickets.save(newTicket, newAllocations, 0);
        orderAllocations = newAllocations;
      }
      if (cancelled || !activeTicket) return;
      setTicket(activeTicket);
      setAllocations(orderAllocations);

      const ticketPayments = await paymentsPort.listByTicket(activeTicket.id);
      if (!cancelled) setPayments(ticketPayments);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [tableId, ticketId, tables, orders, tickets, paymentsPort]);

  if (!order || !ticket) return null;

  const allocatedLineItemIds = new Set(
    allocations.filter((allocation) => allocation.ticketId === ticket.id).map((a) => a.lineItemId),
  );
  const ticketLineItems = order.lineItems.filter((line) => allocatedLineItemIds.has(line.id));

  const lines: RegisterPaymentPanelLine[] = ticketLineItems.map((line) => ({
    id: line.id,
    name: line.nameSnapshot,
    quantity: line.quantity,
    unitPriceCents: line.unitPriceCents,
    totalCents: line.totalCents,
    pourSizeMl: line.pourSizeMl as RegisterPaymentPanelLine["pourSizeMl"],
    isAdjustment: line.isAdjustment,
  }));
  const subtotalCents = ticketLineItems.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0,
  );
  const taxCents = ticketLineItems.reduce((sum, line) => sum + line.taxCents, 0);
  const totalCents = ticketTotals(ticket.id, order.lineItems, allocations).cents;
  const alreadyPaidCents = paymentsTotal(payments);
  const remainingBalanceCents = Math.max(0, totalCents - alreadyPaidCents);

  const selectedMethod = methodRegistry.find((method) => method.code === selectedMethodCode);
  const methodRequiresTendered = selectedMethod?.requiresTendered ?? false;
  const effectiveAmountToPayCents = amountToPayCents ?? remainingBalanceCents;

  let changeDueCents: number | null = null;
  if (
    methodRequiresTendered &&
    tenderedCents !== null &&
    tenderedCents >= effectiveAmountToPayCents
  ) {
    changeDueCents = computeChange({
      remainingCents: effectiveAmountToPayCents,
      tenderedCents,
    }).changeCents;
  }

  const canConfirm =
    effectiveAmountToPayCents > 0 &&
    effectiveAmountToPayCents <= remainingBalanceCents &&
    selectedMethod !== undefined &&
    (!methodRequiresTendered ||
      (tenderedCents !== null && tenderedCents >= effectiveAmountToPayCents));

  async function handleConfirmPayment(): Promise<void> {
    if (!selectedMethod || !ticket) return;

    const updatedPayments = applyPayment(methodRegistry, payments, {
      ticketId: ticket.id,
      methodCode: selectedMethod.code as PaymentMethodCode,
      amountCents: effectiveAmountToPayCents,
      tenderedCents: methodRequiresTendered && tenderedCents !== null ? tenderedCents : undefined,
    });
    const newPayment = updatedPayments[updatedPayments.length - 1];
    if (!newPayment) return;
    await paymentsPort.record(newPayment);
    setPayments(updatedPayments);
    setTenderedCents(null);
    setAmountToPayCents(null);

    const newBalance = Math.max(0, totalCents - paymentsTotal(updatedPayments));
    if (newBalance === 0) {
      const paidTicket = withStatus(ticket, "paid");
      const saved = await tickets.save(paidTicket, allocations, ticket.version);
      setTicket(saved);
    }
  }

  return (
    <RegisterPaymentPanel
      lines={lines}
      subtotalCents={subtotalCents}
      taxCents={taxCents}
      totalCents={totalCents}
      remainingBalanceCents={remainingBalanceCents}
      amountToPayCents={effectiveAmountToPayCents}
      onAmountToPayChange={setAmountToPayCents}
      methods={methodRegistry.map((method) => ({
        code: method.code,
        label: method.label,
        requiresTendered: method.requiresTendered,
      }))}
      selectedMethodCode={selectedMethodCode}
      onSelectMethod={setSelectedMethodCode}
      tenderedCents={tenderedCents}
      onTenderedChange={setTenderedCents}
      changeDueCents={changeDueCents}
      onConfirmPayment={() => void handleConfirmPayment()}
      canConfirm={canConfirm}
    />
  );
}
