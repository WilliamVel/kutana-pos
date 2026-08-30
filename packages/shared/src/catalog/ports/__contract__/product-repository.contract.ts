import { describe, expect, it } from "vitest";
import { ConflictError } from "../../../errors/conflict-error.js";
import { createProduct, withActive, type Product } from "../../model/product.js";
import type { ProductRepository } from "../product-repository.js";

/**
 * Implementation-agnostic conformance suite for `ProductRepository`.
 */
export function runProductRepositoryContract(
  createRepository: () => ProductRepository | Promise<ProductRepository>,
): void {
  describe("ProductRepository contract", () => {
    it("returns null from findById when no product exists", async () => {
      const repository = await createRepository();
      expect(await repository.findById("does-not-exist")).toBeNull();
    });

    it("returns null from findBySku and findByBarcode when absent", async () => {
      const repository = await createRepository();
      expect(await repository.findBySku("NO-SKU")).toBeNull();
      expect(await repository.findByBarcode("NO-BARCODE")).toBeNull();
    });

    it("saves a product and reads it back by id, sku, and barcode", async () => {
      const repository = await createRepository();
      const product = createProduct({
        sku: "BEER-500",
        barcode: "7501234567890",
        name: "Draft Lager 500ml",
        categoryId: "category-beer",
        priceCents: 350,
        taxRateBp: 1200,
        stockKind: "volume",
        pourSizeMl: 500,
        stockItemId: "stock-keg-1",
      });

      const saved = await repository.save(product, product.version);
      expect(saved.id).toBe(product.id);

      expect((await repository.findById(product.id))?.sku).toBe("BEER-500");
      expect((await repository.findBySku("BEER-500"))?.id).toBe(product.id);
      expect((await repository.findByBarcode("7501234567890"))?.id).toBe(product.id);
    });

    it("excludes inactive products from listByCategory by default, and includes them with includeInactive", async () => {
      const repository = await createRepository();
      const active = createProduct({
        sku: "SKU-ACTIVE",
        name: "Active Product",
        categoryId: "category-x",
        priceCents: 100,
        taxRateBp: 1200,
        stockKind: "unit",
      });
      const toDeactivate = createProduct({
        sku: "SKU-INACTIVE",
        name: "Inactive Product",
        categoryId: "category-x",
        priceCents: 100,
        taxRateBp: 1200,
        stockKind: "unit",
      });

      await repository.save(active, active.version);
      const deactivated = withActive(toDeactivate, false);
      await repository.save(deactivated, toDeactivate.version);

      const defaultList = await repository.listByCategory("category-x");
      expect(defaultList.map((product) => product.sku)).toEqual(["SKU-ACTIVE"]);

      const fullList = await repository.listByCategory("category-x", { includeInactive: true });
      expect(fullList.map((product) => product.sku).sort()).toEqual(["SKU-ACTIVE", "SKU-INACTIVE"]);
    });

    it("throws ConflictError when expectedVersion no longer matches the stored version", async () => {
      const repository = await createRepository();
      const product = createProduct({
        sku: "SKU-CONFLICT",
        name: "Conflict Product",
        categoryId: "category-y",
        priceCents: 100,
        taxRateBp: 1200,
        stockKind: "unit",
      });
      const firstSave = await repository.save(product, product.version);

      await repository.save(withActive(firstSave, false), firstSave.version);

      const staleWrite = repository.save(withActive(firstSave, true), firstSave.version);
      await expect(staleWrite).rejects.toBeInstanceOf(ConflictError);
    });

    it("carries the current stored snapshot on ConflictError", async () => {
      const repository = await createRepository();
      const product = createProduct({
        sku: "SKU-CONFLICT-2",
        name: "Conflict Product 2",
        categoryId: "category-y",
        priceCents: 100,
        taxRateBp: 1200,
        stockKind: "unit",
      });
      const firstSave = await repository.save(product, product.version);
      const winner = await repository.save(withActive(firstSave, false), firstSave.version);

      try {
        await repository.save(withActive(firstSave, true), firstSave.version);
        expect.unreachable("expected a stale save to throw ConflictError");
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictError);
        const conflict = error as ConflictError<Product>;
        expect(conflict.currentSnapshot.active).toBe(winner.active);
        expect(conflict.currentSnapshot.version).toBe(winner.version);
      }
    });
  });
}
