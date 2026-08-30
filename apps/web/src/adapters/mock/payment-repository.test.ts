import { describe } from "vitest";
import { runPaymentRepositoryContract } from "@kutana/shared/payments/ports/__contract__/payment-repository.contract.js";
import { MockPaymentRepository } from "./payment-repository.js";

describe("MockPaymentRepository", () => {
  runPaymentRepositoryContract(() => new MockPaymentRepository());
});
