import type { Category } from "@kutana/shared/catalog/model/category.js";
import type { CategoryRepository } from "@kutana/shared/catalog/ports/category-repository.js";
import { simulateLatency } from "./simulate-latency.js";

/** In-memory `CategoryRepository` for milestone 1. Categories are not versioned (no optimistic-concurrency need in v1 — see port contract). */
export class MockCategoryRepository implements CategoryRepository {
  private readonly categoriesById = new Map<string, Category>();

  async findById(id: string): Promise<Category | null> {
    return simulateLatency(() => this.categoriesById.get(id) ?? null);
  }

  async listAll(): Promise<Category[]> {
    return simulateLatency(() => [...this.categoriesById.values()]);
  }

  async save(category: Category): Promise<Category> {
    return simulateLatency(() => {
      this.categoriesById.set(category.id, category);
      return category;
    });
  }

  async delete(id: string): Promise<void> {
    return simulateLatency(() => {
      this.categoriesById.delete(id);
    });
  }
}
