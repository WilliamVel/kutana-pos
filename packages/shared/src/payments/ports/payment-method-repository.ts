import type { PaymentMethodRegistry } from "../model/payment-method-registry.js";

/** Port contract only — implementations live in adapters (mock/HTTP/Postgres). */
export interface PaymentMethodRepository {
  listAll(): Promise<PaymentMethodRegistry>;
}
