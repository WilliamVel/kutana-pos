import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import type { Customer } from "@kutana/shared/billing/model/personal-account.js";
import type { CustomerRepository } from "@kutana/shared/billing/ports/customer-repository.js";
import { PostgresPool } from "../../../infrastructure/postgres/postgres-pool.js";

interface CustomerRow {
  id: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const iso = (value: Date | string): string => value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const mapCustomer = (row: CustomerRow): Customer => ({
  id: row.id,
  displayName: row.display_name,
  phone: row.phone,
  email: row.email,
  notes: row.notes,
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
});

@Injectable()
export class PostgresCustomerRepository implements CustomerRepository {
  constructor(@Inject(PostgresPool) private readonly pool: Pool) {}

  async findById(id: string): Promise<Customer | null> {
    const result = await this.pool.query<CustomerRow>(
      "SELECT id, display_name, phone, email, notes, created_at, updated_at FROM customers WHERE id = $1",
      [id],
    );
    return result.rows[0] ? mapCustomer(result.rows[0]) : null;
  }

  async listAll(): Promise<Customer[]> {
    const result = await this.pool.query<CustomerRow>(
      "SELECT id, display_name, phone, email, notes, created_at, updated_at FROM customers ORDER BY display_name, id",
    );
    return result.rows.map(mapCustomer);
  }

  async save(customer: Customer): Promise<Customer> {
    const result = await this.pool.query<CustomerRow>(
      `INSERT INTO customers (id, display_name, phone, email, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         phone = EXCLUDED.phone,
         email = EXCLUDED.email,
         notes = EXCLUDED.notes,
         created_at = EXCLUDED.created_at,
         updated_at = EXCLUDED.updated_at
       RETURNING id, display_name, phone, email, notes, created_at, updated_at`,
      [
        customer.id,
        customer.displayName,
        customer.phone,
        customer.email,
        customer.notes,
        customer.createdAt,
        customer.updatedAt,
      ],
    );
    return mapCustomer(result.rows[0]!);
  }

  async delete(id: string): Promise<void> {
    await this.pool.query("DELETE FROM customers WHERE id = $1", [id]);
  }
}
