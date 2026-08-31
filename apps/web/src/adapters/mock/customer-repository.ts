import type { Customer } from "@kutana/shared/billing/model/personal-account.js";
import type { CustomerRepository } from "@kutana/shared/billing/ports/customer-repository.js";
import { simulateLatency } from "./simulate-latency.js";

export class MockCustomerRepository implements CustomerRepository {
  private readonly customersById = new Map<string, Customer>();

  async findById(id: string): Promise<Customer | null> {
    return simulateLatency(() => this.customersById.get(id) ?? null);
  }

  async listAll(): Promise<Customer[]> {
    return simulateLatency(() => [...this.customersById.values()]);
  }

  async save(customer: Customer): Promise<Customer> {
    return simulateLatency(() => {
      this.customersById.set(customer.id, customer);
      return customer;
    });
  }
}
