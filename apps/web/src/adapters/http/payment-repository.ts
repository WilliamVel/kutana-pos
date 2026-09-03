import type { Payment, PaymentTarget } from "@kutana/shared/payments/model/payment.js";
import type { PaymentRepository } from "@kutana/shared/payments/ports/payment-repository.js";
import { encodePathSegment, HttpClient, type HttpClientOptions } from "./http-client.js";

export class HttpPaymentRepository implements PaymentRepository {
  private readonly http: HttpClient;

  constructor(options: HttpClientOptions = {}) {
    this.http = new HttpClient(options);
  }

  listByTarget(target: PaymentTarget): Promise<Payment[]> {
    return this.http.request<Payment[]>("/payments", {
      query: paymentTargetQuery(target),
    });
  }

  listByTicket(ticketId: string): Promise<Payment[]> {
    return this.http.request<Payment[]>(`/payments/tickets/${encodePathSegment(ticketId)}`);
  }

  record(payment: Payment): Promise<Payment> {
    return this.http.request<Payment>("/payments", {
      method: "POST",
      body: payment,
    });
  }
}

function paymentTargetQuery(target: PaymentTarget): Record<string, string> {
  switch (target.kind) {
    case "personal_account":
      return { targetKind: target.kind, accountId: target.accountId };
    case "customer_debt":
      return { targetKind: target.kind, customerId: target.customerId };
    case "ticket":
      return { targetKind: target.kind, ticketId: target.ticketId };
  }
}
