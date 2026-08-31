import { describe, expect, it } from "vitest";
import { ConflictError } from "../../../errors/conflict-error.js";
import {
  createAccountLineAllocation,
  createPersonalAccount,
  type PersonalAccount,
} from "../../model/personal-account.js";
import type { PersonalAccountRepository } from "../personal-account-repository.js";

export function runPersonalAccountRepositoryContract(
  createRepository: () => PersonalAccountRepository | Promise<PersonalAccountRepository>,
): void {
  describe("PersonalAccountRepository contract", () => {
    it("returns null when an account does not exist", async () => {
      const repository = await createRepository();
      await expect(repository.findById("missing-account")).resolves.toBeNull();
    });

    it("saves an account with its quantity allocations transactionally", async () => {
      const repository = await createRepository();
      const account = createPersonalAccount({ id: "account-1", orderId: "order-1", customerId: "customer-1" });
      const allocation = createAccountLineAllocation({ id: "allocation-1", accountId: account.id, lineItemId: "line-1", quantity: 2 });

      const saved = await repository.save(account, [allocation], account.version);

      expect(saved.version).toBe(account.version + 1);
      await expect(repository.findById(account.id)).resolves.toEqual(saved);
      await expect(repository.listAllocationsByOrder("order-1")).resolves.toEqual([allocation]);
    });

    it("lists every personal account that belongs to an order", async () => {
      const repository = await createRepository();
      const accountA = createPersonalAccount({ id: "account-a", orderId: "order-2", freeName: "A" });
      const accountB = createPersonalAccount({ id: "account-b", orderId: "order-2", freeName: "B" });
      const other = createPersonalAccount({ id: "account-other", orderId: "order-other", freeName: "Other" });

      await repository.save(accountB, [], accountB.version);
      await repository.save(other, [], other.version);
      await repository.save(accountA, [], accountA.version);

      const accounts = await repository.listByOrder("order-2");
      expect(accounts.map((account) => account.id).sort()).toEqual(["account-a", "account-b"]);
    });

    it("lists only pending free-name accounts for debt collection", async () => {
      const repository = await createRepository();
      const pendingFreeName = createPersonalAccount({ id: "account-pending-free", orderId: "order-5", freeName: "Juan P." });
      const openFreeName = createPersonalAccount({ id: "account-open-free", orderId: "order-5", freeName: "Lina M." });
      const pendingCustomer = createPersonalAccount({ id: "account-pending-customer", orderId: "order-5", customerId: "customer-1" });

      await repository.save({ ...pendingFreeName, status: "pending" }, [], pendingFreeName.version);
      await repository.save(openFreeName, [], openFreeName.version);
      await repository.save({ ...pendingCustomer, status: "pending" }, [], pendingCustomer.version);

      await expect(repository.listPendingFreeName()).resolves.toEqual([{ ...pendingFreeName, status: "pending", version: pendingFreeName.version + 1 }]);
    });

    it("throws ConflictError when expectedVersion is stale", async () => {
      const repository = await createRepository();
      const account = createPersonalAccount({ id: "account-conflict", orderId: "order-3", freeName: "Mesa" });
      const saved = await repository.save(account, [], account.version);
      await repository.save({ ...saved, status: "pending" }, [], saved.version);

      await expect(repository.save({ ...saved, status: "paid" }, [], saved.version)).rejects.toBeInstanceOf(ConflictError);
    });

    it("carries the current stored account snapshot on ConflictError", async () => {
      const repository = await createRepository();
      const account = createPersonalAccount({ id: "account-conflict-current", orderId: "order-4", freeName: "Mesa" });
      const saved = await repository.save(account, [], account.version);
      const winner = await repository.save({ ...saved, status: "pending" }, [], saved.version);

      try {
        await repository.save({ ...saved, status: "paid" }, [], saved.version);
        expect.unreachable("expected a stale save to throw ConflictError");
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictError);
        const conflict = error as ConflictError<PersonalAccount>;
        expect(conflict.currentSnapshot).toEqual(winner);
      }
    });
  });
}
