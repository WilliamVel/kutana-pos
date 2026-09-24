import type { CustomerDebtEntry } from "@kutana/shared/billing/model/customer-debt-ledger.js";
import type { PendingDebtPage, PendingDebtPageQuery } from "@kutana/shared/billing/model/pending-debt-page.js";
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

  listPendingPage(query: PendingDebtPageQuery): Promise<PendingDebtPage> {
    const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize), sort: query.sort ?? "activity" });
    if (query.search?.trim()) params.set("search", query.search.trim());
    return this.http.request<PendingDebtPage>(`/billing/customer-debts/pending?${params.toString()}`);
  }

  record(entry: CustomerDebtEntry): Promise<CustomerDebtEntry> {
    return this.http.request<CustomerDebtEntry>("/billing/customer-debts", {
      method: "POST",
      body: entry,
    });
  }
}
