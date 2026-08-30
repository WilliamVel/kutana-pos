import { describe } from "vitest";
import { runStockRepositoryContract } from "@kutana/shared/inventory/ports/__contract__/stock-repository.contract.js";
import { MockStockRepository } from "./stock-repository.js";

describe("MockStockRepository", () => {
  runStockRepositoryContract(() => new MockStockRepository());
});
