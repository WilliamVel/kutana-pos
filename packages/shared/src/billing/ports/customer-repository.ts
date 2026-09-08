import type { Customer } from "../model/personal-account.js";

/** Port contract only — implementations live in adapters (mock/HTTP/Postgres). */
export interface CustomerRepository {
  findById(id: string): Promise<Customer | null>;
  listAll(): Promise<Customer[]>;
  save(customer: Customer): Promise<Customer>;
  delete(id: string): Promise<void>;
}
