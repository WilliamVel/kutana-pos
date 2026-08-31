import { describe } from "vitest";
import { runPersonalAccountRepositoryContract } from "@kutana/shared/billing/ports/__contract__/personal-account-repository.contract.js";
import { MockPersonalAccountRepository } from "./personal-account-repository.js";

describe("MockPersonalAccountRepository", () => {
  runPersonalAccountRepositoryContract(() => new MockPersonalAccountRepository());
});
