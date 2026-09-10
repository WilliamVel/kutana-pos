import { Module } from "@nestjs/common";
import { PostgresModule } from "../infrastructure/postgres/postgres.module.js";
import { PaymentsController } from "../payments/payments.controller.js";
import { PostgresPaymentMethodRepository } from "../payments/adapters/postgres/payment-method-repository.js";
import { PostgresPaymentRepository } from "../payments/adapters/postgres/payment-repository.js";
import { PostgresCustomerDebtRepository } from "./adapters/postgres/customer-debt-repository.js";
import { PostgresCustomerRepository } from "./adapters/postgres/customer-repository.js";
import { PostgresPersonalAccountRepository } from "./adapters/postgres/personal-account-repository.js";
import { PostgresSaleRepository } from "./adapters/postgres/sale-repository.js";
import { PostgresTicketRepository } from "./adapters/postgres/ticket-repository.js";
import { BillingCoreController } from "./billing-core.controller.js";
import { PaymentClosureService } from "./payment-closure.service.js";
import { SalesAnalyticsService } from "./sales-analytics.service.js";

@Module({
  imports: [PostgresModule],
  controllers: [BillingCoreController, PaymentsController],
  providers: [
    PostgresTicketRepository,
    PostgresCustomerRepository,
    PostgresPersonalAccountRepository,
    PostgresCustomerDebtRepository,
    PostgresPaymentRepository,
    PostgresPaymentMethodRepository,
    PostgresSaleRepository,
    SalesAnalyticsService,
    PaymentClosureService,
  ],
})
export class BillingCoreModule {}
