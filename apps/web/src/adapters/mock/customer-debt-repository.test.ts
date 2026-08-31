import { describe } from "vitest";
import { runCustomerDebtRepositoryContract } from "@kutana/shared/billing/ports/__contract__/customer-debt-repository.contract.js";
import { MockCustomerDebtRepository } from "./customer-debt-repository.js";

describe("MockCustomerDebtRepository", () => {
  runCustomerDebtRepositoryContract(() => new MockCustomerDebtRepository());
});
