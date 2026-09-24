import type { CustomerDebtEntry } from "../model/customer-debt-ledger.js";
import type { PendingDebtPage, PendingDebtPageQuery } from "../model/pending-debt-page.js";

/** Port contract only — implementations live in adapters (mock/HTTP/Postgres). */
export interface CustomerDebtRepository {
  listByCustomer(customerId: string): Promise<CustomerDebtEntry[]>;
  listAll(): Promise<CustomerDebtEntry[]>;
  /** Server-side pagination capability; legacy adapters may omit it during migration. */
  listPendingPage?(query: PendingDebtPageQuery): Promise<PendingDebtPage>;
  record(entry: CustomerDebtEntry): Promise<CustomerDebtEntry>;
}
