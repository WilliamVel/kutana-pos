import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import {
  isPaymentMethodDisplayable,
  type PaymentMethodRegistry,
  type PaymentMethodRegistryEntry,
} from "@kutana/shared/payments/model/payment-method-registry.js";
import type { PaymentMethodRepository } from "@kutana/shared/payments/ports/payment-method-repository.js";
import { PostgresPool } from "../../../infrastructure/postgres/postgres-pool.js";

interface PaymentMethodRow {
  code: string;
  label: string;
  requires_tendered: boolean;
  active: boolean;
  sort_order: number;
}

const mapPaymentMethod = (row: PaymentMethodRow): PaymentMethodRegistryEntry => ({
  code: row.code as PaymentMethodRegistryEntry["code"],
  label: row.label,
  requiresTendered: row.requires_tendered,
  active: row.active,
  sortOrder: row.sort_order,
});

@Injectable()
export class PostgresPaymentMethodRepository implements PaymentMethodRepository {
  constructor(@Inject(PostgresPool) private readonly pool: Pool) {}

  async listAll(): Promise<PaymentMethodRegistry> {
    const result = await this.pool.query<PaymentMethodRow>(
      "SELECT code, label, requires_tendered, active, sort_order FROM payment_methods ORDER BY sort_order, code",
    );
    return result.rows.map(mapPaymentMethod).filter(isPaymentMethodDisplayable);
  }
}
