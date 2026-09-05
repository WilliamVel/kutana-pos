import type { Category } from "@kutana/shared/catalog/model/category.js";
import type { CategoryRepository } from "@kutana/shared/catalog/ports/category-repository.js";
import { encodePathSegment, HttpClient, type HttpClientOptions } from "./http-client.js";

export class HttpCategoryRepository implements CategoryRepository {
  private readonly http: HttpClient;

  constructor(options: HttpClientOptions = {}) {
    this.http = new HttpClient(options);
  }

  findById(id: string): Promise<Category | null> {
    return this.http.request<Category | null>(`/catalog/categories/${encodePathSegment(id)}`);
  }

  listAll(): Promise<Category[]> {
    return this.http.request<Category[]>("/catalog/categories");
  }

  save(category: Category): Promise<Category> {
    return this.http.request<Category>(`/catalog/categories/${encodePathSegment(category.id)}`, {
      method: "PUT",
      body: category,
    });
  }
}
