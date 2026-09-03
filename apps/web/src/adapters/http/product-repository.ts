import type { Product } from "@kutana/shared/catalog/model/product.js";
import type { ProductRepository } from "@kutana/shared/catalog/ports/product-repository.js";
import { encodePathSegment, HttpClient, type HttpClientOptions } from "./http-client.js";

export class HttpProductRepository implements ProductRepository {
  private readonly http: HttpClient;

  constructor(options: HttpClientOptions = {}) {
    this.http = new HttpClient(options);
  }

  findById(id: string): Promise<Product | null> {
    return this.http.request<Product | null>(`/catalog/products/${encodePathSegment(id)}`);
  }

  findBySku(sku: string): Promise<Product | null> {
    return this.http.request<Product | null>(`/catalog/products/by-sku/${encodePathSegment(sku)}`);
  }

  findByBarcode(barcode: string): Promise<Product | null> {
    return this.http.request<Product | null>(`/catalog/products/by-barcode/${encodePathSegment(barcode)}`);
  }

  listByCategory(categoryId: string, options: { includeInactive?: boolean } = {}): Promise<Product[]> {
    return this.http.request<Product[]>(`/catalog/categories/${encodePathSegment(categoryId)}/products`, {
      query: { includeInactive: options.includeInactive === true ? true : undefined },
    });
  }

  save(product: Product, expectedVersion: number): Promise<Product> {
    return this.http.request<Product>(`/catalog/products/${encodePathSegment(product.id)}`, {
      method: "PUT",
      body: { product, expectedVersion },
    });
  }
}
