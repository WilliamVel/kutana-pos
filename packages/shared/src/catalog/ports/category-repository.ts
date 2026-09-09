import type { Category } from "../model/category.js";

/** Port contract only — implementations live in adapters (mock/HTTP/Postgres). */
export interface CategoryRepository {
  findById(id: string): Promise<Category | null>;
  listAll(): Promise<Category[]>;
  save(category: Category): Promise<Category>;
  delete(id: string): Promise<void>;
}
