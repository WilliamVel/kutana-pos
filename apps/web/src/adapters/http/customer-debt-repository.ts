import type { CustomerDebtEntry } from "@kutana/shared/billing/model/customer-debt-ledger.js";
import type { CustomerDebtRepository } from "@kutana/shared/billing/ports/customer-debt-repository.js";
import { encodePathSegment, HttpClient, type HttpClientOptions } from "./http-client.js";

export class HttpCustomerDebtRepository implements CustomerDebtRepository {
  private readonly http: HttpClient;

  constructor(options: HttpClientOptions = {}) {
    this.http = new HttpClient(options);
  }

  listByCustomer(customerId: string): Promise<CustomerDebtEntry[]> {
    return this.http.request<CustomerDebtEntry[]>(
      `/billing/customers/${encodePathSegment(customerId)}/debts`,
    );
  }

  listAll(): Promise<CustomerDebtEntry[]> {
    return this.http.request<CustomerDebtEntry[]>("/billing/customer-debts");
  }

  record(entry: CustomerDebtEntry): Promise<CustomerDebtEntry> {
    return this.http.request<CustomerDebtEntry>("/billing/customer-debts", {
      method: "POST",
      body: entry,
    });
  }
}
