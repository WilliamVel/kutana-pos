import type {
  AccountLineAllocation,
  PersonalAccount,
} from "@kutana/shared/billing/model/personal-account.js";
import type { PersonalAccountRepository } from "@kutana/shared/billing/ports/personal-account-repository.js";
import { ConflictError } from "@kutana/shared/errors/conflict-error.js";
import { ConflictTrigger } from "./conflict-trigger.js";
import { simulateLatency } from "./simulate-latency.js";

export class MockPersonalAccountRepository implements PersonalAccountRepository {
  private readonly accountsById = new Map<string, PersonalAccount>();
  private readonly allocationsById = new Map<string, AccountLineAllocation>();
  readonly conflictTrigger = new ConflictTrigger();

  async findById(id: string): Promise<PersonalAccount | null> {
    return simulateLatency(() => this.accountsById.get(id) ?? null);
  }

  async listByOrder(orderId: string): Promise<PersonalAccount[]> {
    return simulateLatency(() =>
      [...this.accountsById.values()].filter((account) => account.orderId === orderId),
    );
  }

  async listPendingFreeName(): Promise<PersonalAccount[]> {
    return simulateLatency(() =>
      [...this.accountsById.values()].filter(
        (account) => account.status === "pending" && account.owner.kind === "free_name",
      ),
    );
  }

  async listAllocationsByOrder(orderId: string): Promise<AccountLineAllocation[]> {
    return simulateLatency(() => {
      const accountIds = new Set(
        [...this.accountsById.values()]
          .filter((account) => account.orderId === orderId)
          .map((account) => account.id),
      );
      return [...this.allocationsById.values()].filter((allocation) =>
        accountIds.has(allocation.accountId),
      );
    });
  }

  async save(
    account: PersonalAccount,
    allocations: readonly AccountLineAllocation[],
    expectedVersion: number,
  ): Promise<PersonalAccount> {
    return simulateLatency(() => {
      const stored = this.accountsById.get(account.id) ?? null;

      if (this.conflictTrigger.consumeForcedConflict()) {
        throw new ConflictError<PersonalAccount>(
          "Forced conflict (test/demo trigger)",
          stored ?? account,
        );
      }

      if (stored && stored.version !== expectedVersion) {
        throw new ConflictError<PersonalAccount>(
          `PersonalAccount ${account.id} version conflict: expected ${expectedVersion}, stored ${stored.version}`,
          stored,
        );
      }

      const next: PersonalAccount = { ...account, version: expectedVersion + 1 };
      this.accountsById.set(account.id, next);
      for (const allocation of allocations) {
        this.allocationsById.set(allocation.id, allocation);
      }
      return next;
    });
  }

  async removeAllocation(
    accountId: string,
    allocationId: string,
    expectedVersion: number,
  ): Promise<PersonalAccount> {
    return simulateLatency(() => {
      const account = this.accountsById.get(accountId);
      if (!account || account.version !== expectedVersion) {
        throw new ConflictError<PersonalAccount>(
          `PersonalAccount ${accountId} version conflict`,
          account ?? {
            id: accountId,
            orderId: "unknown-order",
            owner: { kind: "free_name", freeName: "Unknown account" },
            status: "open",
            createdAt: new Date().toISOString(),
            closedAt: null,
            version: expectedVersion,
          },
        );
      }
      const allocation = this.allocationsById.get(allocationId);
      if (!allocation || allocation.accountId !== accountId) return account;
      this.allocationsById.delete(allocationId);
      const next = { ...account, version: expectedVersion + 1 };
      this.accountsById.set(accountId, next);
      return next;
    });
  }

  async delete(id: string, expectedVersion: number): Promise<void> {
    return simulateLatency(() => {
      const stored = this.accountsById.get(id) ?? null;

      if (this.conflictTrigger.consumeForcedConflict()) {
        throw new ConflictError<PersonalAccount>(
          "Forced conflict (test/demo trigger)",
          stored ?? {
            id,
            orderId: "unknown-order",
            owner: { kind: "free_name", freeName: "Unknown account" },
            status: "open",
            createdAt: new Date().toISOString(),
            closedAt: null,
            version: expectedVersion,
          },
        );
      }

      if (!stored) return;
      if (stored.version !== expectedVersion) {
        throw new ConflictError<PersonalAccount>(
          `PersonalAccount ${id} version conflict: expected ${expectedVersion}, stored ${stored.version}`,
          stored,
        );
      }

      this.accountsById.delete(id);
      for (const [allocationId, allocation] of this.allocationsById.entries()) {
        if (allocation.accountId === id) {
          this.allocationsById.delete(allocationId);
        }
      }
    });
  }
}
