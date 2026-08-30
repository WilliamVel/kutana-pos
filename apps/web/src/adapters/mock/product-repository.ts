import { ConflictError } from "@kutana/shared/errors/conflict-error.js";
import type { Product } from "@kutana/shared/catalog/model/product.js";
import type { ProductRepository } from "@kutana/shared/catalog/ports/product-repository.js";
import { ConflictTrigger } from "./conflict-trigger.js";
import { simulateLatency } from "./simulate-latency.js";

/** In-memory `ProductRepository` for milestone 1. */
export class MockProductRepository implements ProductRepository {
  private readonly productsById = new Map<string, Product>();
  readonly conflictTrigger = new ConflictTrigger();

  async findById(id: string): Promise<Product | null> {
    return simulateLatency(() => this.productsById.get(id) ?? null);
  }

  async findBySku(sku: string): Promise<Product | null> {
    return simulateLatency(
      () => [...this.productsById.values()].find((product) => product.sku === sku) ?? null,
    );
  }

  async findByBarcode(barcode: string): Promise<Product | null> {
    return simulateLatency(
      () => [...this.productsById.values()].find((product) => product.barcode === barcode) ?? null,
    );
  }

  async listByCategory(
    categoryId: string,
    options?: { includeInactive?: boolean },
  ): Promise<Product[]> {
    return simulateLatency(() =>
      [...this.productsById.values()].filter(
        (product) =>
          product.categoryId === categoryId &&
          (options?.includeInactive === true || product.active),
      ),
    );
  }

  async save(product: Product, expectedVersion: number): Promise<Product> {
    return simulateLatency(() => {
      const stored = this.productsById.get(product.id) ?? null;

      if (this.conflictTrigger.consumeForcedConflict()) {
        throw new ConflictError<Product>("Forced conflict (test/demo trigger)", stored ?? product);
      }

      if (stored && stored.version !== expectedVersion) {
        throw new ConflictError<Product>(
          `Product ${product.id} version conflict: expected ${expectedVersion}, stored ${stored.version}`,
          stored,
        );
      }

      const next: Product = { ...product, version: expectedVersion + 1 };
      this.productsById.set(product.id, next);
      return next;
    });
  }
}
