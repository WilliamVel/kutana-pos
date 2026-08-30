import { describe } from "vitest";
import { runOrderRepositoryContract } from "@kutana/shared/ordering/ports/__contract__/order-repository.contract.js";
import { MockOrderRepository } from "./order-repository.js";

describe("MockOrderRepository", () => {
  runOrderRepositoryContract(() => new MockOrderRepository());
});
