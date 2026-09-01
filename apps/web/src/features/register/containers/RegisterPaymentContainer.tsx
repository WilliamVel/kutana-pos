import { useEffect, useState } from "react";
import { createAllocation, type Allocation } from "@kutana/shared/billing/model/allocation.js";
import {
  accountBalance,
  derivePersonalAccountStatus,
  type AccountLineAllocation,
  type AccountPaymentAmount,
  type Customer,
  type PersonalAccount,
} from "@kutana/shared/billing/model/personal-account.js";
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
  useCustomers,
  useOrders,
  usePaymentMethods,
  usePayments,
  usePersonalAccounts,
  useTables,
  useTickets,
} from "../../../composition/PortsProvider.js";
import {
  RegisterPaymentPanel,
  type RegisterPaymentPanelLine,
} from "../components/RegisterPaymentPanel.js";

export interface RegisterPaymentContainerProps {
  readonly tableId: string;
  readonly personalAccountId?: string;
  readonly onPaymentComplete?: () => void;
  /**
   * @deprecated Legacy milestone-1 ticket payment path. Whole-table payment
   * still uses tickets while personal-account settlement uses `personalAccountId`.
   */
  readonly ticketId?: string;
}

function ownerLabel(account: PersonalAccount, customers: readonly Customer[]): string {
  const { owner } = account;
  if (owner.kind === "free_name") return owner.freeName;
  return customers.find((customer) => customer.id === owner.customerId)?.displayName ?? owner.customerId;
}

function toAccountPayments(accountId: string, payments: readonly Payment[]): AccountPaymentAmount[] {
  return payments.map((payment) => ({ accountId, amountCents: payment.amountCents }));
}

function paymentMethodLabel(code: string, fallback: string): string {
  const labels: Record<string, string> = {
    CASH: "Efectivo",
    BANK_TRANSFER: "Transferencia bancaria",
    QR_PAYMENT: "Pago QR",
  };

  return labels[code] ?? fallback;
}

/**
 * Wires the legacy register/payment screen to the domain. New payable behavior
 * should use `PersonalAccount` payment targets; this compatibility container
 * derives totals from the v1 `Allocation` set so historical whole-table and
 * ticket-specific tests keep their original data path while migration finishes.
 * Payment method selection is driven entirely from `usePaymentMethods()` (the
 * registry), never a hardcoded list.
 */
export function RegisterPaymentContainer({
  tableId,
  personalAccountId,
  onPaymentComplete,
  ticketId,
}: RegisterPaymentContainerProps): JSX.Element | null {
  const tables = useTables();
  const orders = useOrders();
  const tickets = useTickets();
  const accountsPort = usePersonalAccounts();
  const customersPort = useCustomers();
  const paymentsPort = usePayments();
  const methodRegistry = usePaymentMethods();

  const [order, setOrder] = useState<Order | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [personalAccount, setPersonalAccount] = useState<PersonalAccount | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [accountAllocations, setAccountAllocations] = useState<AccountLineAllocation[]>([]);
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
      setCustomers(await customersPort.listAll());

      if (personalAccountId) {
        const [account, orderAccountAllocations, accountPayments] = await Promise.all([
          accountsPort.findById(personalAccountId),
          accountsPort.listAllocationsByOrder(foundOrder.id),
          paymentsPort.listByTarget({ kind: "personal_account", accountId: personalAccountId }),
        ]);
        if (cancelled || !account) return;
        setPersonalAccount(account);
        setAccountAllocations(orderAccountAllocations);
        setPayments(accountPayments);
        setTicket(null);
        return;
      }

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
  }, [accountsPort, customersPort, orders, paymentsPort, personalAccountId, tableId, ticketId, tables, tickets]);

  if (!order || (!ticket && !personalAccount)) return null;

  const activeAccountAllocations = personalAccount
    ? accountAllocations.filter((allocation) => allocation.accountId === personalAccount.id)
    : [];
  const accountLines: RegisterPaymentPanelLine[] = activeAccountAllocations.flatMap((allocation) => {
    const line = order.lineItems.find((candidate) => candidate.id === allocation.lineItemId);
    if (!line) return [];
    return [{
      id: allocation.id,
      name: line.nameSnapshot,
      quantity: allocation.quantity,
      unitPriceCents: line.unitPriceCents,
      totalCents: Math.round((line.totalCents / line.quantity) * allocation.quantity),
      pourSizeMl: line.pourSizeMl as RegisterPaymentPanelLine["pourSizeMl"],
      isAdjustment: line.isAdjustment,
    }];
  });

  const allocatedLineItemIds = ticket
    ? new Set(allocations.filter((allocation) => allocation.ticketId === ticket.id).map((a) => a.lineItemId))
    : new Set<string>();
  const ticketLineItems = ticket ? order.lineItems.filter((line) => allocatedLineItemIds.has(line.id)) : [];
  const ticketLines: RegisterPaymentPanelLine[] = ticketLineItems.map((line) => ({
    id: line.id,
    name: line.nameSnapshot,
    quantity: line.quantity,
    unitPriceCents: line.unitPriceCents,
    totalCents: line.totalCents,
    pourSizeMl: line.pourSizeMl as RegisterPaymentPanelLine["pourSizeMl"],
    isAdjustment: line.isAdjustment,
  }));

  const lines = personalAccount ? accountLines : ticketLines;
  const subtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const taxCents = Math.max(0, lines.reduce((sum, line) => sum + line.totalCents, 0) - subtotalCents);
  const totalCents = personalAccount
    ? accountBalance({
      accountId: personalAccount.id,
      lineItems: order.lineItems,
      allocations: accountAllocations,
      payments: toAccountPayments(personalAccount.id, payments),
    }).totalCents
    : ticketTotals(ticket!.id, order.lineItems, allocations).cents;
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
    if (!selectedMethod) return;

    if (personalAccount) {
      const newPayment: Payment = {
        id: crypto.randomUUID(),
        target: { kind: "personal_account", accountId: personalAccount.id },
        methodCode: selectedMethod.code as PaymentMethodCode,
        amountCents: effectiveAmountToPayCents,
        tenderedCents: methodRequiresTendered && tenderedCents !== null ? tenderedCents : null,
        changeCents: methodRequiresTendered && tenderedCents !== null
          ? computeChange({ remainingCents: effectiveAmountToPayCents, tenderedCents }).changeCents
          : null,
        recordedAt: new Date().toISOString(),
      };
      await paymentsPort.record(newPayment);
      const updatedPayments = [...payments, newPayment];
      setPayments(updatedPayments);
      setTenderedCents(null);
      setAmountToPayCents(null);

      const paidCents = paymentsTotal(updatedPayments);
      const status = derivePersonalAccountStatus({ totalCents, paidCents, isPending: false });
      const saved = await accountsPort.save(
        { ...personalAccount, status, closedAt: status === "paid" ? new Date().toISOString() : null },
        accountAllocations,
        personalAccount.version,
      );
      setPersonalAccount(saved);
      if (status === "paid") onPaymentComplete?.();
      return;
    }

    if (!ticket) return;

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
      onPaymentComplete?.();
    }
  }

  return (
    <RegisterPaymentPanel
      title={personalAccount ? `Cobrar a ${ownerLabel(personalAccount, customers)}` : "Cobrar saldo de mesa"}
      subtitle={personalAccount ? "Cobrale a esta cuenta personal con el mismo flujo de pago." : "Cobrá el saldo actual de la mesa."}
      lines={lines}
      subtotalCents={subtotalCents}
      taxCents={taxCents}
      totalCents={totalCents}
      remainingBalanceCents={remainingBalanceCents}
      amountToPayCents={effectiveAmountToPayCents}
      onAmountToPayChange={setAmountToPayCents}
      methods={methodRegistry.map((method) => ({
        code: method.code,
        label: paymentMethodLabel(method.code, method.label),
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
