import type { PaymentMethodRegistry } from "@kutana/shared/payments/model/payment-method-registry.js";
import { KUTANA_V1_PAYMENT_METHODS } from "@kutana/shared/payments/model/payment-method-registry.seed.js";
import type { PaymentMethodRepository } from "@kutana/shared/payments/ports/payment-method-repository.js";
import { simulateLatency } from "./simulate-latency.js";

export class MockPaymentMethodRepository implements PaymentMethodRepository {
  async listAll(): Promise<PaymentMethodRegistry> {
    return simulateLatency(() => KUTANA_V1_PAYMENT_METHODS);
  }
}
