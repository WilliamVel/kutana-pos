import type { CustomerDebtEntry } from "../model/customer-debt-ledger.js";

/** Port contract only — implementations live in adapters (mock/HTTP/Postgres). */
export interface CustomerDebtRepository {
  listByCustomer(customerId: string): Promise<CustomerDebtEntry[]>;
  listAll(): Promise<CustomerDebtEntry[]>;
  record(entry: CustomerDebtEntry): Promise<CustomerDebtEntry>;
}
