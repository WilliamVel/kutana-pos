import type {
  AccountLineAllocation,
  PersonalAccount,
} from "@kutana/shared/billing/model/personal-account.js";
import type { PersonalAccountRepository } from "@kutana/shared/billing/ports/personal-account-repository.js";
import { encodePathSegment, HttpClient, type HttpClientOptions } from "./http-client.js";

export class HttpPersonalAccountRepository implements PersonalAccountRepository {
  private readonly http: HttpClient;

  constructor(options: HttpClientOptions = {}) {
    this.http = new HttpClient(options);
  }

  findById(id: string): Promise<PersonalAccount | null> {
    return this.http.request<PersonalAccount | null>(`/billing/personal-accounts/${encodePathSegment(id)}`);
  }

  listByOrder(orderId: string): Promise<PersonalAccount[]> {
    return this.http.request<PersonalAccount[]>("/billing/personal-accounts", {
      query: { orderId },
    });
  }

  listPendingFreeName(): Promise<PersonalAccount[]> {
    return this.http.request<PersonalAccount[]>("/billing/personal-accounts/pending-free-name");
  }

  listAllocationsByOrder(orderId: string): Promise<AccountLineAllocation[]> {
    return this.http.request<AccountLineAllocation[]>(
      `/billing/orders/${encodePathSegment(orderId)}/account-line-allocations`,
    );
  }

  save(
    account: PersonalAccount,
    allocations: readonly AccountLineAllocation[],
    expectedVersion: number,
  ): Promise<PersonalAccount> {
    return this.http.request<PersonalAccount>(`/billing/personal-accounts/${encodePathSegment(account.id)}`, {
      method: "PUT",
      body: { account, allocations, expectedVersion },
    });
  }

  async delete(id: string, expectedVersion: number): Promise<void> {
    await this.http.request<void>(`/billing/personal-accounts/${encodePathSegment(id)}`, {
      method: "DELETE",
      query: { expectedVersion },
    });
  }
}
