import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Optional,
  Query,
  Req,
} from "@nestjs/common";
import type { Allocation } from "@kutana/shared/billing/model/allocation.js";
import type { CustomerDebtEntry } from "@kutana/shared/billing/model/customer-debt-ledger.js";
import type {
  AccountLineAllocation,
  Customer,
  PersonalAccount,
} from "@kutana/shared/billing/model/personal-account.js";
import type { Ticket } from "@kutana/shared/billing/model/ticket.js";
import type { Sale } from "@kutana/shared/billing/model/sale.js";
import type { TokenPayload } from "../auth/auth.service.js";
import { PaymentClosureService } from "./payment-closure.service.js";
import {
  SalesAnalyticsService,
  type AnalyticsDateQuery,
  type DailySalesTotal,
  type PaymentMixRow,
  type PendingExposureRow,
  type ProductMixRow,
} from "./sales-analytics.service.js";
import { PostgresCustomerDebtRepository } from "./adapters/postgres/customer-debt-repository.js";
import { PostgresCustomerRepository } from "./adapters/postgres/customer-repository.js";
import { PostgresPersonalAccountRepository } from "./adapters/postgres/personal-account-repository.js";
import { PostgresTicketRepository } from "./adapters/postgres/ticket-repository.js";

interface SaveTicketDto {
  readonly ticket: Ticket;
  readonly allocations: Allocation[];
  readonly expectedVersion: number;
}

interface AuthenticatedRequest {
  readonly auth?: TokenPayload;
}

interface SavePersonalAccountDto {
  readonly account: PersonalAccount;
  readonly allocations: AccountLineAllocation[];
  readonly expectedVersion: number;
}

@Controller("billing")
export class BillingCoreController {
  constructor(
    private readonly tickets: PostgresTicketRepository,
    private readonly customers: PostgresCustomerRepository,
    private readonly personalAccounts: PostgresPersonalAccountRepository,
    private readonly customerDebts: PostgresCustomerDebtRepository,
    @Optional() private readonly salesAnalytics?: SalesAnalyticsService,
    @Optional() private readonly paymentClosure?: PaymentClosureService,
  ) {}

  @Get("analytics/daily-sales")
  dailySales(@Query() query: AnalyticsDateQuery): Promise<DailySalesTotal[]> {
    if (!this.salesAnalytics) throw new Error("Sales analytics service is unavailable");
    return this.salesAnalytics.dailySales(query);
  }

  @Get("analytics/product-mix")
  productMix(@Query() query: AnalyticsDateQuery): Promise<ProductMixRow[]> {
    if (!this.salesAnalytics) throw new Error("Sales analytics service is unavailable");
    return this.salesAnalytics.productMix(query);
  }

  @Get("analytics/payment-mix")
  paymentMix(@Query() query: AnalyticsDateQuery): Promise<PaymentMixRow[]> {
    if (!this.salesAnalytics) throw new Error("Sales analytics service is unavailable");
    return this.salesAnalytics.paymentMix(query);
  }

  @Get("analytics/pending-exposure")
  pendingExposure(@Query() query: AnalyticsDateQuery): Promise<PendingExposureRow[]> {
    if (!this.salesAnalytics) throw new Error("Sales analytics service is unavailable");
    return this.salesAnalytics.pendingExposure(query);
  }

  @Post("orders/:id/close")
  closeOrder(@Param("id") id: string, @Req() request: AuthenticatedRequest): Promise<Sale> {
    if (!this.paymentClosure) throw new Error("Payment closure service is unavailable");
    return this.paymentClosure.closeOrder(id, request.auth?.sub ?? "");
  }

  @Get("tickets/:id")
  findTicketById(@Param("id") id: string): Promise<Ticket | null> {
    return this.tickets.findById(id);
  }

  @Get("orders/:orderId/tickets")
  listTicketsByOrder(@Param("orderId") orderId: string): Promise<Ticket[]> {
    return this.tickets.listByOrder(orderId);
  }

  @Get("orders/:orderId/allocations")
  listTicketAllocationsByOrder(@Param("orderId") orderId: string): Promise<Allocation[]> {
    return this.tickets.listAllocationsByOrder(orderId);
  }

  @Put("tickets/:id")
  saveTicket(@Param("id") id: string, @Body() body: SaveTicketDto): Promise<Ticket> {
    return this.tickets.save({ ...body.ticket, id }, body.allocations, body.expectedVersion);
  }

  @Get("customers")
  listCustomers(@Query("q") query?: string): Promise<Customer[]> {
    return query?.trim() ? this.customers.search(query) : this.customers.listAll();
  }

  @Get("customers/:id")
  findCustomerById(@Param("id") id: string): Promise<Customer | null> {
    return this.customers.findById(id);
  }

  @Put("customers/:id")
  saveCustomer(@Param("id") id: string, @Body() body: Customer): Promise<Customer> {
    return this.customers.save({ ...body, id });
  }

  @Delete("customers/:id")
  deleteCustomer(@Param("id") id: string): Promise<void> {
    return this.customers.delete(id);
  }

  @Get("customers/:customerId/debts")
  listCustomerDebtsByCustomer(
    @Param("customerId") customerId: string,
  ): Promise<CustomerDebtEntry[]> {
    return this.customerDebts.listByCustomer(customerId);
  }

  @Get("personal-accounts/pending-free-name")
  listPendingFreeNamePersonalAccounts(): Promise<PersonalAccount[]> {
    return this.personalAccounts.listPendingFreeName();
  }

  @Get("personal-accounts")
  listPersonalAccounts(@Query("orderId") orderId?: string): Promise<PersonalAccount[]> {
    if (!orderId) {
      throw new BadRequestException("orderId query parameter is required");
    }
    return this.personalAccounts.listByOrder(orderId);
  }

  @Get("personal-accounts/:id")
  findPersonalAccountById(@Param("id") id: string): Promise<PersonalAccount | null> {
    return this.personalAccounts.findById(id);
  }

  @Get("orders/:orderId/account-line-allocations")
  listAccountLineAllocationsByOrder(
    @Param("orderId") orderId: string,
  ): Promise<AccountLineAllocation[]> {
    return this.personalAccounts.listAllocationsByOrder(orderId);
  }

  @Put("personal-accounts/:id")
  savePersonalAccount(
    @Param("id") id: string,
    @Body() body: SavePersonalAccountDto,
  ): Promise<PersonalAccount> {
    return this.personalAccounts.save(
      { ...body.account, id },
      body.allocations,
      body.expectedVersion,
    );
  }

  @Delete("personal-accounts/:id")
  deletePersonalAccount(
    @Param("id") id: string,
    @Query("expectedVersion") expectedVersion?: string,
  ): Promise<void> {
    if (!expectedVersion?.trim()) {
      throw new BadRequestException("expectedVersion query parameter must be an integer");
    }

    const parsedExpectedVersion = Number(expectedVersion);
    if (!Number.isInteger(parsedExpectedVersion)) {
      throw new BadRequestException("expectedVersion query parameter must be an integer");
    }
    return this.personalAccounts.delete(id, parsedExpectedVersion);
  }

  @Get("customer-debts")
  listCustomerDebts(): Promise<CustomerDebtEntry[]> {
    return this.customerDebts.listAll();
  }

  @Post("customer-debts")
  recordCustomerDebt(@Body() body: CustomerDebtEntry): Promise<CustomerDebtEntry> {
    return this.customerDebts.record(body);
  }
}
