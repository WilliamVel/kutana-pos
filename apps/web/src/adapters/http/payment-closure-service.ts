import type { Sale } from "@kutana/shared/billing/model/sale.js";
import type { PaymentClosureService } from "@kutana/shared/billing/ports/payment-closure-service.js";
import { encodePathSegment, HttpClient, type HttpClientOptions } from "./http-client.js";

export class HttpPaymentClosureService implements PaymentClosureService {
  private readonly http: HttpClient;

  constructor(options: HttpClientOptions = {}) {
    this.http = new HttpClient(options);
  }

  closeOrder(orderId: string): Promise<Sale> {
    return this.http.request<Sale>(`/billing/orders/${encodePathSegment(orderId)}/close`, {
      method: "POST",
    });
  }
}
