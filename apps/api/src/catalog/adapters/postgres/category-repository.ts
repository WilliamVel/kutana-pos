import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import type { Category } from "@kutana/shared/catalog/model/category.js";
import type { CategoryRepository } from "@kutana/shared/catalog/ports/category-repository.js";
import { PostgresPool } from "../../../infrastructure/postgres/postgres-pool.js";

interface CategoryRow {
  id: string;
  name: string;
  sort_order: number;
}

const mapCategory = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
  sortOrder: row.sort_order,
});

@Injectable()
export class PostgresCategoryRepository implements CategoryRepository {
  constructor(@Inject(PostgresPool) private readonly pool: Pool) {}

  async findById(id: string): Promise<Category | null> {
    const result = await this.pool.query<CategoryRow>("SELECT id, name, sort_order FROM categories WHERE id = $1", [id]);
    return result.rows[0] ? mapCategory(result.rows[0]) : null;
  }

  async listAll(): Promise<Category[]> {
    const result = await this.pool.query<CategoryRow>(
      "SELECT id, name, sort_order FROM categories ORDER BY sort_order, id",
    );
    return result.rows.map(mapCategory);
  }

  async save(category: Category): Promise<Category> {
    const result = await this.pool.query<CategoryRow>(
      `INSERT INTO categories (id, name, sort_order) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order
       RETURNING id, name, sort_order`,
      [category.id, category.name, category.sortOrder],
    );
    const row = result.rows[0];
    if (!row) throw new Error(`Category ${category.id} was not returned after save`);
    return mapCategory(row);
  }
}
