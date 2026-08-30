import { describe } from "vitest";
import { runProductRepositoryContract } from "@kutana/shared/catalog/ports/__contract__/product-repository.contract.js";
import { MockProductRepository } from "./product-repository.js";

describe("MockProductRepository", () => {
  runProductRepositoryContract(() => new MockProductRepository());
});
