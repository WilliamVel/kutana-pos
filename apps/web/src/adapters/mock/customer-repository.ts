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

  async search(query: string): Promise<Customer[]> {
    return simulateLatency(() => {
      const needle = query.trim().toLowerCase();
      if (!needle) return [...this.customersById.values()];
      return [...this.customersById.values()].filter((customer) =>
        [customer.displayName, customer.phone, customer.email]
          .filter((value): value is string => value !== null)
          .some((value) => value.toLowerCase().includes(needle)),
      );
    });
  }

  async save(customer: Customer): Promise<Customer> {
    return simulateLatency(() => {
      this.customersById.set(customer.id, customer);
      return customer;
    });
  }

  async delete(id: string): Promise<void> {
    return simulateLatency(() => {
      this.customersById.delete(id);
    });
  }
}
