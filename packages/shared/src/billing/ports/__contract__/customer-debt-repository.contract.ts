import { describe, expect, it } from "vitest";
import { createCustomerDebtEntry } from "../../model/customer-debt-ledger.js";
import type { CustomerDebtRepository } from "../customer-debt-repository.js";

export function runCustomerDebtRepositoryContract(
  createRepository: () => CustomerDebtRepository | Promise<CustomerDebtRepository>,
): void {
  describe("CustomerDebtRepository contract", () => {
    it("returns an empty list when the customer has no ledger entries", async () => {
      const repository = await createRepository();
      await expect(repository.listByCustomer("customer-empty")).resolves.toEqual([]);
    });

    it("records append-only debit and credit entries for a customer", async () => {
      const repository = await createRepository();
      const debit = createCustomerDebtEntry({ id: "debt-1", customerId: "customer-1", direction: "debit", amountCents: 1000 });
      const credit = createCustomerDebtEntry({ id: "debt-2", customerId: "customer-1", direction: "credit", amountCents: 400, paymentId: "payment-1" });

      await repository.record(debit);
      await repository.record(credit);

      const entries = await repository.listByCustomer("customer-1");
      expect(entries.map((entry) => entry.id)).toEqual(["debt-1", "debt-2"]);
    });

    it("does not mix entries from other customers", async () => {
      const repository = await createRepository();
      await repository.record(createCustomerDebtEntry({ id: "debt-a", customerId: "customer-a", direction: "debit", amountCents: 100 }));
      await repository.record(createCustomerDebtEntry({ id: "debt-b", customerId: "customer-b", direction: "debit", amountCents: 200 }));

      const entries = await repository.listByCustomer("customer-a");
      expect(entries.map((entry) => entry.id)).toEqual(["debt-a"]);
    });

    it("lists all recorded ledger entries", async () => {
      const repository = await createRepository();
      await repository.record(createCustomerDebtEntry({ id: "debt-all-a", customerId: "customer-a", direction: "debit", amountCents: 100 }));
      await repository.record(createCustomerDebtEntry({ id: "debt-all-b", customerId: "customer-b", direction: "credit", amountCents: 50, paymentId: "payment-b" }));

      const entries = await repository.listAll();
      expect(entries.map((entry) => entry.id).sort()).toEqual(["debt-all-a", "debt-all-b"]);
    });
  });
}
