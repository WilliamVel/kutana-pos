import type { Sale } from "../model/sale.js";

/** Authenticated application port for atomically closing an order and its table. */
export interface PaymentClosureService {
  closeOrder(orderId: string): Promise<Sale>;
}
