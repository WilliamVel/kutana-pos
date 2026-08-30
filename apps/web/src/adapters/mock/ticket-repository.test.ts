import { describe } from "vitest";
import { runTicketRepositoryContract } from "@kutana/shared/billing/ports/__contract__/ticket-repository.contract.js";
import { MockTicketRepository } from "./ticket-repository.js";

describe("MockTicketRepository", () => {
  runTicketRepositoryContract(() => new MockTicketRepository());
});
