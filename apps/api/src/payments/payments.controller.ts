import { BadRequestException, Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import type { Payment, PaymentTarget } from "@kutana/shared/payments/model/payment.js";
import type { PaymentMethodRegistry } from "@kutana/shared/payments/model/payment-method-registry.js";
import { customerDebtBalance } from "@kutana/shared/billing/model/customer-debt-ledger.js";
import { PostgresCustomerDebtRepository } from "../billing/adapters/postgres/customer-debt-repository.js";
import { PostgresPaymentMethodRepository } from "./adapters/postgres/payment-method-repository.js";
import { PostgresPaymentRepository } from "./adapters/postgres/payment-repository.js";

interface PaymentsQuery {
  readonly targetKind?: string;
  readonly accountId?: string;
  readonly customerId?: string;
  readonly ticketId?: string;
}

@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly payments: PostgresPaymentRepository,
    private readonly paymentMethods: PostgresPaymentMethodRepository,
    private readonly debts?: PostgresCustomerDebtRepository,
  ) {}

  @Get("methods")
  listPaymentMethods(): Promise<PaymentMethodRegistry> {
    return this.paymentMethods.listAll();
  }

  @Get()
  listByTarget(@Query() query: PaymentsQuery): Promise<Payment[]> {
    return this.payments.listByTarget(parsePaymentTarget(query));
  }

  @Get("tickets/:ticketId")
  listByTicket(@Param("ticketId") ticketId: string): Promise<Payment[]> {
    return this.payments.listByTicket(ticketId);
  }

  @Post()
  async recordPayment(@Body() body: Payment): Promise<Payment> {
    validatePaymentPayload(body);
    if (body.target.kind === "customer_debt" && this.debts) {
      const entries = await this.debts.listByCustomer(body.target.customerId);
      const balanceCents = customerDebtBalance({ entries, customerId: body.target.customerId });
      if (body.amountCents > balanceCents) {
        throw new BadRequestException("Payment amount exceeds the outstanding balance");
      }
    }
    return this.payments.record(body);
  }
}

function validatePaymentPayload(payment: Payment): void {
  if (!payment?.id || !Number.isInteger(payment.amountCents) || payment.amountCents <= 0) {
    throw new BadRequestException("Payment amount must be a positive integer number of cents");
  }
  if (!payment.target || !payment.methodCode || !payment.recordedAt) {
    throw new BadRequestException("Payment is missing required fields");
  }
}

function parsePaymentTarget(query: PaymentsQuery): PaymentTarget {
  switch (query.targetKind) {
    case "personal_account":
      if (query.accountId) return { kind: "personal_account", accountId: query.accountId };
      break;
    case "customer_debt":
      if (query.customerId) return { kind: "customer_debt", customerId: query.customerId };
      break;
    case "ticket":
      if (query.ticketId) return { kind: "ticket", ticketId: query.ticketId };
      break;
  }

  throw new BadRequestException("A valid payment target query is required");
}
