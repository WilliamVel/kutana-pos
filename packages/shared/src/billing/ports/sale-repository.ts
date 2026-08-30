import type { Sale } from "../model/sale.js";

/** Port contract only — implementations live in adapters (mock/HTTP/Postgres). Sales are immutable once persisted. */
export interface SaleRepository {
  findByPublicUuid(publicUuid: string): Promise<Sale | null>;
  findByOrderId(orderId: string): Promise<Sale | null>;
  /** Sales are append-only: there is no update path. */
  create(sale: Sale): Promise<Sale>;
}
