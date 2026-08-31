import type { CustomerDebtEntry } from "@kutana/shared/billing/model/customer-debt-ledger.js";
import type { CustomerDebtRepository } from "@kutana/shared/billing/ports/customer-debt-repository.js";
import { simulateLatency } from "./simulate-latency.js";

export class MockCustomerDebtRepository implements CustomerDebtRepository {
  private readonly entries: CustomerDebtEntry[] = [];

  async listByCustomer(customerId: string): Promise<CustomerDebtEntry[]> {
    return simulateLatency(() => this.entries.filter((entry) => entry.customerId === customerId));
  }

  async listAll(): Promise<CustomerDebtEntry[]> {
    return simulateLatency(() => [...this.entries]);
  }

  async record(entry: CustomerDebtEntry): Promise<CustomerDebtEntry> {
    return simulateLatency(() => {
      this.entries.push(entry);
      return entry;
    });
  }
}
