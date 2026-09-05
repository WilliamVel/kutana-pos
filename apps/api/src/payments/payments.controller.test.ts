import "reflect-metadata";
import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { Payment } from "@kutana/shared/payments/model/payment.js";
import type { PaymentMethodCode } from "@kutana/shared/payments/model/payment-method-registry.js";
import { PostgresPaymentRepository } from "./adapters/postgres/payment-repository.js";
import { PaymentsController } from "./payments.controller.js";

const payment: Payment = {
  id: "payment-1",
  target: { kind: "personal_account", accountId: "account-1" },
  methodCode: "cash" as PaymentMethodCode,
  amountCents: 1_200,
  tenderedCents: 1_500,
  changeCents: 300,
  recordedAt: "2025-01-01T00:00:00.000Z",
};

describe("PaymentsController", () => {
  function controllerWithMocks() {
    const payments = {
      listByTarget: vi.fn(),
      listByTicket: vi.fn(),
      record: vi.fn(),
    };

    return {
      controller: new PaymentsController(payments as unknown as PostgresPaymentRepository),
      payments,
    };
  }

  it("parses and delegates personal account target queries", async () => {
    const { controller, payments } = controllerWithMocks();
    payments.listByTarget.mockResolvedValue([payment]);

    await expect(controller.listByTarget({ targetKind: "personal_account", accountId: "account-1" })).resolves.toEqual([
      payment,
    ]);

    expect(payments.listByTarget).toHaveBeenCalledWith({ kind: "personal_account", accountId: "account-1" });
  });

  it("parses and delegates customer debt target queries", async () => {
    const { controller, payments } = controllerWithMocks();
    payments.listByTarget.mockResolvedValue([payment]);

    await controller.listByTarget({ targetKind: "customer_debt", customerId: "customer-1" });

    expect(payments.listByTarget).toHaveBeenCalledWith({ kind: "customer_debt", customerId: "customer-1" });
  });

  it("parses and delegates ticket target queries", async () => {
    const { controller, payments } = controllerWithMocks();
    payments.listByTarget.mockResolvedValue([payment]);

    await controller.listByTarget({ targetKind: "ticket", ticketId: "ticket-1" });

    expect(payments.listByTarget).toHaveBeenCalledWith({ kind: "ticket", ticketId: "ticket-1" });
  });

  it("delegates the legacy ticket payments route", async () => {
    const { controller, payments } = controllerWithMocks();
    payments.listByTicket.mockResolvedValue([payment]);

    await expect(controller.listByTicket("ticket-1")).resolves.toEqual([payment]);

    expect(payments.listByTicket).toHaveBeenCalledWith("ticket-1");
  });

  it("delegates payment recording", async () => {
    const { controller, payments } = controllerWithMocks();
    payments.record.mockResolvedValue(payment);

    await expect(controller.recordPayment(payment)).resolves.toEqual(payment);

    expect(payments.record).toHaveBeenCalledWith(payment);
  });

  it("rejects malformed target queries", async () => {
    const { controller, payments } = controllerWithMocks();

    await expect(() => controller.listByTarget({ targetKind: "personal_account" })).toThrow(BadRequestException);

    expect(payments.listByTarget).not.toHaveBeenCalled();
  });
});
