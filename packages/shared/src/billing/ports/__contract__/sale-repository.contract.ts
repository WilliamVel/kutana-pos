import { describe, expect, it } from "vitest";
import type { Sale } from "../../model/sale.js";
import { createSale } from "../../model/sale.js";
import type { SaleRepository } from "../sale-repository.js";

/** Implementation-agnostic conformance suite for immutable, idempotent sale persistence. */
export function runSaleRepositoryContract(createRepository: () => SaleRepository | Promise<SaleRepository>): void {
  describe("SaleRepository contract", () => {
    it("reads no sale for an unknown order", async () => {
      const repository = await createRepository();
      expect(await repository.findByOrderId("missing-order")).toBeNull();
    });

    it("uses orderId as an idempotency key", async () => {
      const repository = await createRepository();
      const sale: Sale = createSale({ id: "sale-1", publicUuid: "public-1", orderId: "order-1", totalCents: 100, taxTotalCents: 0 });
      const first = await repository.create(sale);
      const retry = await repository.create({ ...sale, id: "different-id", publicUuid: "different-public" });
      expect(retry).toEqual(first);
      expect(await repository.findByOrderId("order-1")).toEqual(first);
      expect(await repository.findByPublicUuid("public-1")).toEqual(first);
    });
  });
}
