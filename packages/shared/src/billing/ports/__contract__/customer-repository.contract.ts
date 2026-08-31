import { describe, expect, it } from "vitest";
import { createCustomer } from "../../model/personal-account.js";
import type { CustomerRepository } from "../customer-repository.js";

export function runCustomerRepositoryContract(
  createRepository: () => CustomerRepository | Promise<CustomerRepository>,
): void {
  describe("CustomerRepository contract", () => {
    it("returns null when a customer does not exist", async () => {
      const repository = await createRepository();
      await expect(repository.findById("missing-customer")).resolves.toBeNull();
    });

    it("saves a customer and reads it back by id", async () => {
      const repository = await createRepository();
      const customer = createCustomer({ id: "customer-1", displayName: "Ana", now: "2025-01-01T00:00:00.000Z" });

      const saved = await repository.save(customer);

      expect(saved).toEqual(customer);
      await expect(repository.findById("customer-1")).resolves.toEqual(customer);
    });

    it("lists every saved customer without relying on insertion order", async () => {
      const repository = await createRepository();
      await repository.save(createCustomer({ id: "customer-b", displayName: "Beto" }));
      await repository.save(createCustomer({ id: "customer-a", displayName: "Ana" }));

      const customers = await repository.listAll();
      expect(customers.map((customer) => customer.id).sort()).toEqual(["customer-a", "customer-b"]);
    });
  });
}
