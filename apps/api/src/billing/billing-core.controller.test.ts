import "reflect-metadata";
import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { describe, expect, it, vi } from "vitest";
import type { Allocation } from "@kutana/shared/billing/model/allocation.js";
import type { CustomerDebtEntry } from "@kutana/shared/billing/model/customer-debt-ledger.js";
import type {
  AccountLineAllocation,
  Customer,
  PersonalAccount,
} from "@kutana/shared/billing/model/personal-account.js";
import type { Ticket } from "@kutana/shared/billing/model/ticket.js";
import { PostgresPool } from "../infrastructure/postgres/postgres-pool.js";
import { PostgresCustomerDebtRepository } from "./adapters/postgres/customer-debt-repository.js";
import { PostgresCustomerRepository } from "./adapters/postgres/customer-repository.js";
import { PostgresPersonalAccountRepository } from "./adapters/postgres/personal-account-repository.js";
import { PostgresTicketRepository } from "./adapters/postgres/ticket-repository.js";
import { BillingCoreController } from "./billing-core.controller.js";
import { BillingCoreModule } from "./billing-core.module.js";

const customer: Customer = {
  id: "customer-original",
  displayName: "Ada",
  phone: null,
  email: null,
  notes: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

const personalAccount: PersonalAccount = {
  id: "account-original",
  orderId: "order-1",
  owner: { kind: "customer", customerId: "customer-1" },
  status: "open",
  createdAt: "2025-01-01T00:00:00.000Z",
  closedAt: null,
  version: 1,
};

const accountAllocation: AccountLineAllocation = {
  id: "account-allocation-1",
  accountId: "account-1",
  lineItemId: "line-1",
  quantity: 2,
};

const ticket: Ticket = {
  id: "ticket-original",
  orderId: "order-1",
  label: "Ticket 1",
  status: "open",
  version: 1,
};

const allocation: Allocation = {
  id: "allocation-1",
  lineItemId: "line-1",
  ticketId: "ticket-1",
  shareBp: 10_000,
};

const debtEntry: CustomerDebtEntry = {
  id: "debt-1",
  customerId: "customer-1",
  kind: "pending_account",
  direction: "debit",
  amountCents: 1_500,
  accountId: "account-1",
  paymentId: null,
  note: null,
  createdAt: "2025-01-01T00:00:00.000Z",
};

describe("BillingCoreController", () => {
  function controllerWithMocks() {
    const tickets = {
      findById: vi.fn(),
      listByOrder: vi.fn(),
      listAllocationsByOrder: vi.fn(),
      save: vi.fn(),
    };
    const customers = {
      findById: vi.fn(),
      listAll: vi.fn(),
      search: vi.fn(),
      save: vi.fn(),
    };
    const personalAccounts = {
      findById: vi.fn(),
      listByOrder: vi.fn(),
      listPendingFreeName: vi.fn(),
      listAllocationsByOrder: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    const customerDebts = {
      listByCustomer: vi.fn(),
      listAll: vi.fn(),
      record: vi.fn(),
    };

    return {
      controller: new BillingCoreController(
        tickets as unknown as PostgresTicketRepository,
        customers as unknown as PostgresCustomerRepository,
        personalAccounts as unknown as PostgresPersonalAccountRepository,
        customerDebts as unknown as PostgresCustomerDebtRepository,
      ),
      tickets,
      customers,
      personalAccounts,
      customerDebts,
    };
  }

  it("delegates list customers to the customer repository", async () => {
    const { controller, customers } = controllerWithMocks();
    customers.listAll.mockResolvedValue([customer]);

    await expect(controller.listCustomers()).resolves.toEqual([customer]);

    expect(customers.listAll).toHaveBeenCalledOnce();
  });

  it("delegates customer search when a query is provided", async () => {
    const { controller, customers } = controllerWithMocks();
    customers.search.mockResolvedValue([customer]);

    await expect(controller.listCustomers("ada")).resolves.toEqual([customer]);

    expect(customers.search).toHaveBeenCalledWith("ada");
    expect(customers.listAll).not.toHaveBeenCalled();
  });

  it("saves a customer with the route id merged into the body", async () => {
    const { controller, customers } = controllerWithMocks();
    customers.save.mockResolvedValue({ ...customer, id: "customer-route" });

    await controller.saveCustomer("customer-route", customer);

    expect(customers.save).toHaveBeenCalledWith({ ...customer, id: "customer-route" });
  });

  it("delegates account allocation lookup by order", async () => {
    const { controller, personalAccounts } = controllerWithMocks();
    personalAccounts.listAllocationsByOrder.mockResolvedValue([accountAllocation]);

    await expect(controller.listAccountLineAllocationsByOrder("order-1")).resolves.toEqual([
      accountAllocation,
    ]);

    expect(personalAccounts.listAllocationsByOrder).toHaveBeenCalledWith("order-1");
  });

  it("saves a personal account with the route id and passes allocations plus expected version", async () => {
    const { controller, personalAccounts } = controllerWithMocks();
    personalAccounts.save.mockResolvedValue({ ...personalAccount, id: "account-route" });

    await controller.savePersonalAccount("account-route", {
      account: personalAccount,
      allocations: [accountAllocation],
      expectedVersion: 3,
    });

    expect(personalAccounts.save).toHaveBeenCalledWith(
      { ...personalAccount, id: "account-route" },
      [accountAllocation],
      3,
    );
  });

  it("deletes a personal account with numeric expectedVersion", async () => {
    const { controller, personalAccounts } = controllerWithMocks();
    personalAccounts.delete.mockResolvedValue(undefined);

    await controller.deletePersonalAccount("account-1", "7");

    expect(personalAccounts.delete).toHaveBeenCalledWith("account-1", 7);
  });

  it("rejects invalid delete expectedVersion", async () => {
    const { controller, personalAccounts } = controllerWithMocks();

    await expect(() => controller.deletePersonalAccount("account-1", "not-a-number")).toThrow(
      BadRequestException,
    );

    expect(personalAccounts.delete).not.toHaveBeenCalled();
  });

  it("saves a ticket with the route id and passes allocations plus expected version", async () => {
    const { controller, tickets } = controllerWithMocks();
    tickets.save.mockResolvedValue({ ...ticket, id: "ticket-route" });

    await controller.saveTicket("ticket-route", {
      ticket,
      allocations: [allocation],
      expectedVersion: 4,
    });

    expect(tickets.save).toHaveBeenCalledWith({ ...ticket, id: "ticket-route" }, [allocation], 4);
  });

  it("delegates customer debt listing by customer", async () => {
    const { controller, customerDebts } = controllerWithMocks();
    customerDebts.listByCustomer.mockResolvedValue([debtEntry]);

    await expect(controller.listCustomerDebtsByCustomer("customer-1")).resolves.toEqual([
      debtEntry,
    ]);

    expect(customerDebts.listByCustomer).toHaveBeenCalledWith("customer-1");
  });

  it("delegates customer debt recording", async () => {
    const { controller, customerDebts } = controllerWithMocks();
    customerDebts.record.mockResolvedValue(debtEntry);

    await expect(controller.recordCustomerDebt(debtEntry)).resolves.toEqual(debtEntry);

    expect(customerDebts.record).toHaveBeenCalledWith(debtEntry);
  });

  it("compiles the billing core module with an overridden Postgres pool", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [BillingCoreModule] })
      .overrideProvider(PostgresPool)
      .useValue({ query: vi.fn(), connect: vi.fn() })
      .compile();

    expect(moduleRef.get(BillingCoreController)).toBeInstanceOf(BillingCoreController);

    await moduleRef.close();
  });
});
