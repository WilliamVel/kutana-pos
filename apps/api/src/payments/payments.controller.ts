import { BadRequestException, Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import type { Payment, PaymentTarget } from "@kutana/shared/payments/model/payment.js";
import { PostgresPaymentRepository } from "./adapters/postgres/payment-repository.js";

interface PaymentsQuery {
  readonly targetKind?: string;
  readonly accountId?: string;
  readonly customerId?: string;
  readonly ticketId?: string;
}

@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PostgresPaymentRepository) {}

  @Get()
  listByTarget(@Query() query: PaymentsQuery): Promise<Payment[]> {
    return this.payments.listByTarget(parsePaymentTarget(query));
  }

  @Get("tickets/:ticketId")
  listByTicket(@Param("ticketId") ticketId: string): Promise<Payment[]> {
    return this.payments.listByTicket(ticketId);
  }

  @Post()
  recordPayment(@Body() body: Payment): Promise<Payment> {
    return this.payments.record(body);
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
