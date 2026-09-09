import type { PaymentMethodRegistry } from "@kutana/shared/payments/model/payment-method-registry.js";
import type { PaymentMethodRepository } from "@kutana/shared/payments/ports/payment-method-repository.js";
import { HttpClient, type HttpClientOptions } from "./http-client.js";

export class HttpPaymentMethodRepository implements PaymentMethodRepository {
  private readonly http: HttpClient;

  constructor(options: HttpClientOptions = {}) {
    this.http = new HttpClient(options);
  }

  listAll(): Promise<PaymentMethodRegistry> {
    return this.http.request<PaymentMethodRegistry>("/payments/methods");
  }
}
