import type { Customer } from "@kutana/shared/billing/model/personal-account.js";
import type { CustomerRepository } from "@kutana/shared/billing/ports/customer-repository.js";
import { encodePathSegment, HttpClient, type HttpClientOptions } from "./http-client.js";

export class HttpCustomerRepository implements CustomerRepository {
  private readonly http: HttpClient;

  constructor(options: HttpClientOptions = {}) {
    this.http = new HttpClient(options);
  }

  findById(id: string): Promise<Customer | null> {
    return this.http.request<Customer | null>(`/billing/customers/${encodePathSegment(id)}`);
  }

  listAll(): Promise<Customer[]> {
    return this.http.request<Customer[]>("/billing/customers");
  }

  save(customer: Customer): Promise<Customer> {
    return this.http.request<Customer>(`/billing/customers/${encodePathSegment(customer.id)}`, {
      method: "PUT",
      body: customer,
    });
  }
}
