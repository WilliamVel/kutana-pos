import type { Sale } from "../model/sale.js";

/** Port contract only — implementations live in adapters (mock/HTTP/Postgres). Sales are immutable once persisted. */
export interface SaleRepository {
  findByPublicUuid(publicUuid: string): Promise<Sale | null>;
  findByOrderId(orderId: string): Promise<Sale | null>;
  /**
   * Persists the closure snapshot. The order id is an idempotency key: retrying
   * the same order must return the existing sale rather than create a duplicate.
   */
  create(sale: Sale): Promise<Sale>;
}
