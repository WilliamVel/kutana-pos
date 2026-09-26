import { createUuid } from "@kutana/shared/platform/uuid.js";
import { isPaymentMethodDisplayable } from "@kutana/shared/payments/model/payment-method-registry.js";
import { useEffect, useRef, useState } from "react";
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
  usePaymentClosure,
  usePayments,
  usePersonalAccounts,
  useTables,
  useTickets,
} from "../../../composition/PortsProvider.js";
import { aggregateOrderLines } from "../../../design-system/molecules/aggregate-order-lines.js";
import {
  RegisterPaymentPanel,
  type RegisterPaymentPanelLine,
} from "../components/RegisterPaymentPanel.js";
import type { PaymentReviewInfo } from "../payment-review.js";

interface AccountPaymentCache {
  readonly accountId: string;
  readonly payments: readonly Payment[];
}

export interface RegisterPaymentContainerProps {
  readonly tableId: string;
  readonly personalAccountId?: string;
  readonly onPaymentComplete?: () => void;
  readonly onWholeTableClosed?: (tableId: string) => void;
  readonly onReviewPayment?: () => void;
  readonly onBack?: () => void;
  /**
   * @deprecated Legacy milestone-1 ticket payment path. Whole-table payment
   * still uses tickets while personal-account settlement uses `personalAccountId`.
   */
  readonly ticketId?: string;
}

function ownerLabel(account: PersonalAccount, customers: readonly Customer[]): string {
  const { owner } = account;
  if (owner.kind === "free_name") return owner.freeName;
  return (
    customers.find((customer) => customer.id === owner.customerId)?.displayName ?? owner.customerId
  );
}

function toAccountPayments(
  accountId: string,
  payments: readonly Payment[],
): AccountPaymentAmount[] {
  return payments.map((payment) => ({ accountId, amountCents: payment.amountCents }));
}

function toCachedAccountPayments(entries: readonly AccountPaymentCache[]): AccountPaymentAmount[] {
  return entries.flatMap((entry) => toAccountPayments(entry.accountId, entry.payments));
}

function unpaidLineItems(
  order: Order,
  accounts: readonly PersonalAccount[],
  allocations: readonly AccountLineAllocation[],
): Order["lineItems"] {
  const paidAccountIds = new Set(
    accounts.filter((account) => account.status === "paid").map((account) => account.id),
  );
  return order.lineItems.flatMap((line) => {
    const paidQuantity = allocations
      .filter(
        (allocation) =>
          allocation.lineItemId === line.id && paidAccountIds.has(allocation.accountId),
      )
      .reduce((sum, allocation) => sum + allocation.quantity, 0);
    const remainingQuantity = line.quantity - paidQuantity;
    if (remainingQuantity <= 0) return [];
    if (paidQuantity <= 0) return [line];
    return [
      {
        ...line,
        quantity: remainingQuantity,
        taxCents: Math.round((line.taxCents / line.quantity) * remainingQuantity),
        totalCents: Math.round((line.totalCents / line.quantity) * remainingQuantity),
      },
    ];
  });
}

function accountLinesForDisplay(
  order: Order,
  allocations: readonly AccountLineAllocation[],
  accountId: string,
): RegisterPaymentPanelLine[] {
  const displayLines = allocations
    .filter((item) => item.accountId === accountId)
    .flatMap((allocation) => {
      const line = order.lineItems.find((candidate) => candidate.id === allocation.lineItemId);
      if (!line) return [];
      return [
        {
          id: allocation.id,
          productId: line.productId,
          name: line.nameSnapshot,
          quantity: allocation.quantity,
          unitPriceCents: line.unitPriceCents,
          totalCents: Math.round((line.totalCents / line.quantity) * allocation.quantity),
          taxCents: Math.round((line.taxCents / line.quantity) * allocation.quantity),
          taxRateBp: line.taxRateBp,
          pourSizeMl: line.pourSizeMl,
          isAdjustment: line.isAdjustment,
        },
      ];
    });
  return aggregateOrderLines(displayLines).map((line) => ({
    id: line.id,
    name: line.name,
    quantity: line.quantity,
    unitPriceCents: line.unitPriceCents,
    totalCents: line.totalCents,
    pourSizeMl: line.pourSizeMl as RegisterPaymentPanelLine["pourSizeMl"],
    isAdjustment: line.isAdjustment,
  }));
}

function isHttpResponseError(error: unknown): error is Error & { status: number; responseBody: string | null } {
  return error instanceof Error && "status" in error && typeof error.status === "number"
    && "responseBody" in error && (typeof error.responseBody === "string" || error.responseBody === null);
}

function paymentReviewInfo(error: unknown): PaymentReviewInfo | null {
  if (!isHttpResponseError(error) || error.status !== 409 || !error.responseBody) return null;
  try {
    const body = JSON.parse(error.responseBody) as {
      code?: string;
      unresolvedLineItems?: unknown[];
      blockingAccounts?: unknown[];
    };
    if (body.code !== "ORDER_REVIEW_REQUIRED") return null;
    return {
      unresolvedProducts: body.unresolvedLineItems?.length ?? 0,
      unpaidAccounts: body.blockingAccounts?.length ?? 0,
    };
  } catch {
    return null;
  }
}

function paymentErrorMessage(error: unknown): string {
  if (paymentReviewInfo(error)) {
    return "El pago se registró. La mesa permanece abierta para completar una revisión.";
  }
  if (isHttpResponseError(error)) {
    if (error.status === 409) return "La orden cambió mientras se registraba el pago. Actualizá la pantalla e intentá nuevamente.";
    if (error.status >= 500) return "El servidor no pudo completar la operación. Intentá nuevamente en unos segundos.";
    return "No se pudo completar el pago. Verificá los datos e intentá nuevamente.";
  }
  if (error instanceof TypeError) return "No se pudo conectar con el servidor. Verificá la conexión e intentá nuevamente.";
  return "No se pudo completar el pago. Intentá nuevamente.";
}

function paymentMethodLabel(code: string, fallback: string): string {
  const labels: Record<string, string> = {
    CASH: "Efectivo",
    BANK_TRANSFER: "Transferencia",
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
  onWholeTableClosed,
  onReviewPayment,
  onBack,
  ticketId,
}: RegisterPaymentContainerProps): JSX.Element | null {
  const tables = useTables();
  const orders = useOrders();
  const tickets = useTickets();
  const accountsPort = usePersonalAccounts();
  const customersPort = useCustomers();
  const paymentsPort = usePayments();
  const paymentClosure = usePaymentClosure();
  const methodRegistry = usePaymentMethods();

  const [order, setOrder] = useState<Order | null>(null);
  const [tableLabel, setTableLabel] = useState<string>("Orden seleccionada");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [personalAccount, setPersonalAccount] = useState<PersonalAccount | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [accountAllocations, setAccountAllocations] = useState<AccountLineAllocation[]>([]);
  const [orderAccounts, setOrderAccounts] = useState<PersonalAccount[]>([]);
  const [orderAccountAllocations, setOrderAccountAllocations] = useState<AccountLineAllocation[]>(
    [],
  );
  const [payments, setPayments] = useState<Payment[]>([]);
  const [accountPayments, setAccountPayments] = useState<AccountPaymentCache[]>([]);
  const [selectedMethodCode, setSelectedMethodCode] = useState<string>(
    methodRegistry[0]?.code ?? "",
  );
  const [tenderedCents, setTenderedCents] = useState<number | null>(null);
  const [amountToPayCents, setAmountToPayCents] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentReview, setPaymentReview] = useState<PaymentReviewInfo | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const processingGuard = useRef(false);
  const availableMethods = methodRegistry.filter(isPaymentMethodDisplayable);

  useEffect(() => {
    if (!selectedMethodCode && availableMethods[0]) {
      setSelectedMethodCode(availableMethods[0].code);
    }
  }, [availableMethods, selectedMethodCode]);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const table = await tables.findById(tableId);
      if (!table?.currentOrderId) {
        if (!cancelled) {
          setLoadState("error");
          setErrorMessage("No hay una orden activa para cobrar.");
        }
        return;
      }
      setTableLabel(table.label);
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
        setAccountPayments([]);
        setTicket(null);
        setLoadState("ready");
        return;
      }

      const existingTickets = await tickets.listByOrder(foundOrder.id);
      let orderAllocations = await tickets.listAllocationsByOrder(foundOrder.id);
      const [foundAccounts, foundAccountAllocations] = await Promise.all([
        accountsPort.listByOrder(foundOrder.id),
        accountsPort.listAllocationsByOrder(foundOrder.id),
      ]);
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
      setOrderAccounts(foundAccounts);
      setOrderAccountAllocations(foundAccountAllocations);
      setLoadState("ready");

      const [ticketPayments, accountPaymentEntries] = await Promise.all([
        paymentsPort.listByTicket(activeTicket.id),
        Promise.all(
          foundAccounts.map(async (account) => ({
            accountId: account.id,
            payments: await paymentsPort.listByTarget({
              kind: "personal_account",
              accountId: account.id,
            }),
          })),
        ),
      ]);
      if (!cancelled) {
        setPayments(ticketPayments);
        setAccountPayments(accountPaymentEntries);
      }
    } catch (error) {
      if (!cancelled) {
        setLoadState("error");
        setErrorMessage(paymentErrorMessage(error));
      }
    }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [
    accountsPort,
    customersPort,
    orders,
    paymentsPort,
    personalAccountId,
    tableId,
    ticketId,
    tables,
    tickets,
  ]);

  if (loadState === "loading" && !order) return <p role="status">Cargando orden…</p>;
  if (loadState === "error" && !order) return <p role="alert">{errorMessage ?? "No se pudo cargar la orden."}</p>;
  if (!order || (!ticket && !personalAccount)) return null;

  const activeAccountAllocations = personalAccount
    ? accountAllocations.filter((allocation) => allocation.accountId === personalAccount.id)
    : [];
  const accountLines = personalAccount
    ? accountLinesForDisplay(order, activeAccountAllocations, personalAccount.id)
    : [];

  const isWholeTablePayment = !personalAccount && ticketId === undefined;
  const allocatedLineItemIds = ticket
    ? new Set(
        allocations
          .filter((allocation) => allocation.ticketId === ticket.id)
          .map((a) => a.lineItemId),
      )
    : new Set<string>();
  const remainingOrderLineItems = unpaidLineItems(order, orderAccounts, orderAccountAllocations);
  const ticketLineItems = ticket
    ? isWholeTablePayment
      ? remainingOrderLineItems
      : remainingOrderLineItems.filter((line) => allocatedLineItemIds.has(line.id))
    : [];
  const ticketLines: RegisterPaymentPanelLine[] = aggregateOrderLines(
    ticketLineItems.map((line) => ({ ...line, name: line.nameSnapshot })),
  ).map((line) => ({
    id: line.id,
    name: line.name,
    quantity: line.quantity,
    unitPriceCents: line.unitPriceCents,
    totalCents: line.totalCents,
    pourSizeMl: line.pourSizeMl as RegisterPaymentPanelLine["pourSizeMl"],
    isAdjustment: line.isAdjustment,
  }));

  const lines = personalAccount ? accountLines : ticketLines;
  const productsError = loadState === "error"
    ? errorMessage ?? "No se pudieron recuperar los productos de la orden."
    : order.lineItems.length > 0 && lines.length === 0
      ? "No se pudieron resolver los productos de esta orden. Regresa al pedido e inténtalo nuevamente."
      : null;
  const productsReady = loadState === "ready" && lines.length > 0 && productsError === null;
  const subtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const taxCents = Math.max(
    0,
    lines.reduce((sum, line) => sum + line.totalCents, 0) - subtotalCents,
  );
  const totalCents = personalAccount
    ? accountBalance({
        accountId: personalAccount.id,
        lineItems: order.lineItems,
        allocations: accountAllocations,
        payments: toAccountPayments(personalAccount.id, payments),
      }).totalCents
    : isWholeTablePayment
      ? ticketLines.reduce((sum, line) => sum + line.totalCents, 0)
      : ticketTotals(ticket!.id, order.lineItems, allocations).cents;
  const accountPaidCents = accountPayments.reduce(
    (sum, entry) => sum + paymentsTotal(entry.payments),
    0,
  );
  const alreadyPaidCents = isWholeTablePayment
    ? accountPaidCents + paymentsTotal(payments)
    : paymentsTotal(payments);
  const remainingBalanceCents = Math.max(0, totalCents - alreadyPaidCents);

  const selectedMethod = availableMethods.find((method) => method.code === selectedMethodCode);
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
    productsReady &&
    effectiveAmountToPayCents > 0 &&
    effectiveAmountToPayCents <= remainingBalanceCents &&
    selectedMethod !== undefined &&
    (!methodRequiresTendered ||
      (tenderedCents !== null && tenderedCents >= effectiveAmountToPayCents));

  async function handleConfirmPayment(): Promise<void> {
    if (processingGuard.current) return;
    processingGuard.current = true;
    console.info("[RegisterPayment] Confirmar pago presionado", {
      target: personalAccount
        ? { kind: "personal_account", accountId: personalAccount.id }
        : { kind: "ticket", ticketId: ticket?.id },
      methodCode: selectedMethodCode || null,
      amountCents: effectiveAmountToPayCents,
      tenderedCents,
      canConfirm,
    });

    if (!canConfirm || !selectedMethod) {
      processingGuard.current = false;
      console.warn("[RegisterPayment] Pago no confirmado: datos incompletos o inválidos", {
        selectedMethodCode: selectedMethodCode || null,
        amountCents: effectiveAmountToPayCents,
        remainingBalanceCents,
        tenderedCents,
      });
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setPaymentReview(null);
    try {
      await processPayment();
      console.info("[RegisterPayment] Pago procesado correctamente");
    } catch (error) {
      console.error("[RegisterPayment] Error al procesar pago", error);
      const review = paymentReviewInfo(error);
      if (review) setPaymentReview(review);
      setErrorMessage(paymentErrorMessage(error));
    } finally {
      processingGuard.current = false;
      setIsProcessing(false);
    }
  }

  async function processPayment(): Promise<void> {
    if (!selectedMethod) return;

    if (personalAccount) {
      const newPayment: Payment = {
        id: createUuid(),
        target: { kind: "personal_account", accountId: personalAccount.id },
        methodCode: selectedMethod.code as PaymentMethodCode,
        amountCents: effectiveAmountToPayCents,
        tenderedCents: methodRequiresTendered && tenderedCents !== null ? tenderedCents : null,
        changeCents:
          methodRequiresTendered && tenderedCents !== null
            ? computeChange({ remainingCents: effectiveAmountToPayCents, tenderedCents })
                .changeCents
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
        {
          ...personalAccount,
          status,
          closedAt: status === "paid" ? new Date().toISOString() : null,
        },
        accountAllocations,
        personalAccount.version,
      );
      setPersonalAccount(saved);
      if (status === "paid") {
        // Let the persisted closure rules decide whether the whole table can
        // close. If they reject it, the payment remains recorded and the
        // review popup receives the concrete blocking reasons.
        await paymentClosure.closeOrder(order!.id);
        onPaymentComplete?.();
      }
      return;
    }

    if (!ticket || !order) return;

    if (isWholeTablePayment && orderAccounts.length > 0) {
      let amountLeft = effectiveAmountToPayCents;
      const nextAccountPayments = accountPayments.map((entry) => ({
        ...entry,
        payments: [...entry.payments],
      }));
      const accountById = new Map(orderAccounts.map((account) => [account.id, account]));
      const accountBalances = orderAccounts.map((account) =>
        accountBalance({
          accountId: account.id,
          lineItems: order.lineItems,
          allocations: orderAccountAllocations,
          payments: toCachedAccountPayments(nextAccountPayments),
        }),
      );
      for (const [index, balance] of accountBalances.entries()) {
        if (amountLeft <= 0) break;
        const amount = Math.min(amountLeft, balance.remainingCents);
        if (amount <= 0) continue;
        const payment: Payment = {
          id: createUuid(),
          target: { kind: "personal_account", accountId: orderAccounts[index]!.id },
          methodCode: selectedMethod.code as PaymentMethodCode,
          amountCents: amount,
          tenderedCents: null,
          changeCents: null,
          recordedAt: new Date().toISOString(),
        };
        await paymentsPort.record(payment);
        const accountId = orderAccounts[index]!.id;
        const entry = nextAccountPayments.find((candidate) => candidate.accountId === accountId);
        if (entry) entry.payments = [...entry.payments, payment];
        amountLeft -= amount;
        const account = accountById.get(accountId);
        if (account) {
          const paidCents = balance.paidCents + amount;
          await accountsPort.save(
            {
              ...account,
              status: derivePersonalAccountStatus({
                totalCents: balance.totalCents,
                paidCents,
                isPending: false,
              }),
              closedAt: paidCents >= balance.totalCents ? new Date().toISOString() : null,
            },
            orderAccountAllocations,
            account.version,
          );
        }
      }

      let nextTicketPayments = payments;
      if (amountLeft > 0) {
        nextTicketPayments = applyPayment(availableMethods, payments, {
          ticketId: ticket.id,
          methodCode: selectedMethod.code as PaymentMethodCode,
          amountCents: amountLeft,
          tenderedCents: methodRequiresTendered && tenderedCents !== null ? tenderedCents : undefined,
        });
        const ticketPayment = nextTicketPayments[nextTicketPayments.length - 1];
        if (ticketPayment) await paymentsPort.record(ticketPayment);
      }
      setAccountPayments(nextAccountPayments);
      setPayments(nextTicketPayments);
      setTenderedCents(null);
      setAmountToPayCents(null);
      if (effectiveAmountToPayCents >= remainingBalanceCents) {
        await paymentClosure.closeOrder(order.id);
        onWholeTableClosed?.(tableId);
        onPaymentComplete?.();
      }
      return;
    }

    const updatedPayments = applyPayment(availableMethods, payments, {
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
      const allocationsToSave = isWholeTablePayment
        ? order!.lineItems.map(
            (line) =>
              allocations.find(
                (allocation) =>
                  allocation.ticketId === ticket.id && allocation.lineItemId === line.id,
              ) ?? createAllocation({ lineItemId: line.id, ticketId: ticket.id }),
          )
        : allocations;
      const saved = await tickets.save(paidTicket, allocationsToSave, ticket.version);
      setTicket(saved);
      if (isWholeTablePayment) {
        // A paid ticket is not enough: close the order and free the table so
        // the order disappears from the open-orders list.
        await paymentClosure.closeOrder(order!.id);
        onWholeTableClosed?.(tableId);
      }
      onPaymentComplete?.();
    }
  }

  return (
    <RegisterPaymentPanel
      title={personalAccount ? `Cobrar a ${ownerLabel(personalAccount, customers)}` : tableLabel}
      subtitle={
        personalAccount ? "Cobrale a esta cuenta personal con el mismo flujo de pago." : undefined
      }
      orderStatus={remainingBalanceCents < totalCents ? "Pago parcial" : "Pendiente"}
      onBack={onBack}
      lines={lines}
      isLoadingProducts={loadState === "loading"}
      productsError={productsError}
      subtotalCents={subtotalCents}
      taxCents={taxCents}
      totalCents={totalCents}
      remainingBalanceCents={remainingBalanceCents}
      paidCents={alreadyPaidCents}
      amountToPayCents={effectiveAmountToPayCents}
      onAmountToPayChange={setAmountToPayCents}
      methods={availableMethods.map((method) => ({
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
      isProcessing={isProcessing}
      errorMessage={errorMessage}
      paymentReview={paymentReview}
      onDismissError={() => {
        setErrorMessage(null);
        setPaymentReview(null);
      }}
      onReviewError={onReviewPayment}
    />
  );
}
