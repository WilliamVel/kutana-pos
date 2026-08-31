import { describe } from "vitest";
import { runCustomerRepositoryContract } from "@kutana/shared/billing/ports/__contract__/customer-repository.contract.js";
import { MockCustomerRepository } from "./customer-repository.js";

describe("MockCustomerRepository", () => {
  runCustomerRepositoryContract(() => new MockCustomerRepository());
});
