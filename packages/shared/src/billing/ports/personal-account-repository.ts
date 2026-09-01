import type { AccountLineAllocation, PersonalAccount } from "../model/personal-account.js";

/** Port contract only — implementations live in adapters (mock/HTTP/Postgres). */
export interface PersonalAccountRepository {
  findById(id: string): Promise<PersonalAccount | null>;
  listByOrder(orderId: string): Promise<PersonalAccount[]>;
  listPendingFreeName(): Promise<PersonalAccount[]>;
  listAllocationsByOrder(orderId: string): Promise<AccountLineAllocation[]>;
  save(
    account: PersonalAccount,
    allocations: readonly AccountLineAllocation[],
    expectedVersion: number,
  ): Promise<PersonalAccount>;
  delete(id: string, expectedVersion: number): Promise<void>;
}
