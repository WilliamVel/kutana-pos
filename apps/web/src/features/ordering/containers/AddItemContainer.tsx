import { useEffect, useState } from "react";
import { ConflictError } from "@kutana/shared/errors/conflict-error.js";
import type { Order } from "@kutana/shared/ordering/model/order.js";
import { addLineItem } from "@kutana/shared/ordering/services/line-item-service.js";
import {
  useCategories,
  useOrderEvents,
  useOrders,
  useProducts,
} from "../../../composition/PortsProvider.js";
import { AddItemPanel, type AddItemPanelProduct } from "../components/AddItemPanel.js";

export interface AddItemContainerProps {
  readonly tableId: string;
}

/**
 * Wires `AddItemPanel` to the catalog and ordering ports. Mirrors the
 * future `POST /orders/:orderId/line-items` endpoint: the caller supplies
 * only a productId + quantity, and name/price/tax/pour-size are snapshotted
 * from the catalog loaded from the database. Follows the codebase's
 * read -> apply-domain-fn -> save -> catch-`ConflictError` seam; there is
 * no new repository method.
 */
export function AddItemContainer({ tableId }: AddItemContainerProps): JSX.Element | null {
  const categories = useCategories();
  const products = useProducts();
  const orders = useOrders();
  const events = useOrderEvents();

  const [catalog, setCatalog] = useState<AddItemPanelProduct[]>([]);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      const cats = await categories.listAll();
      const perCat = await Promise.all(
        cats.map((category) => products.listByCategory(category.id)),
      );
      if (cancelled) return;
      setCategoryNames(cats.map((category) => category.name));
      setCatalog(
        cats.flatMap((category, index) =>
          (perCat[index] ?? []).map((product) => ({
            id: product.id,
            name: product.name,
            priceCents: product.priceCents,
            categoryName: category.name,
            taxRateBp: product.taxRateBp,
            pourSizeMl: product.pourSizeMl,
            imageUrl: product.imageUrl,
          })),
        ),
      );

      const found = await orders.findByTable(tableId);
      if (cancelled) return;
      setOrder(found);
      window.dispatchEvent(new CustomEvent("kutana.order.updated", {
        detail: {
          orderId: found?.id,
          tableId,
          orderCount: found?.lineItems.reduce((sum, line) => sum + line.quantity, 0) ?? 0,
          productCount: cats.flatMap((_, index) => perCat[index] ?? []).length,
        },
      }));
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [tableId, categories, products, orders]);

  const disabled = order === null || order.status === "paid";

  async function handleAdd(productId: string, quantity: number): Promise<void> {
    const current = await orders.findByTable(tableId);
    if (!current) {
      return;
    }

    const product = catalog.find((candidate) => candidate.id === productId);
    if (!product) {
      return;
    }

    const next = addLineItem(current, {
      productId,
      nameSnapshot: product.name,
      unitPriceCents: product.priceCents,
      taxRateBp: product.taxRateBp,
      quantity,
      pourSizeMl: product.pourSizeMl ?? null,
    });

    try {
      const saved = await orders.save(next, current.version);
      setOrder(saved);
      window.dispatchEvent(new CustomEvent("kutana.order.updated", {
        detail: {
          orderId: saved.id,
          tableId,
          orderCount: saved.lineItems.reduce((sum, line) => sum + line.quantity, 0),
          productCount: catalog.length,
        },
      }));
      events.publish({
        type: "order.updated",
        orderId: saved.id,
        tableId,
        version: saved.version,
        at: new Date().toISOString(),
        payload: saved,
      });
      setConflict(null);
    } catch (error) {
      if (error instanceof ConflictError) {
        setOrder((error.currentSnapshot as Order | null) ?? null);
        setConflict("this order just changed — your item wasn't added, try again");
      } else {
        throw error;
      }
    }
  }

  if (!order && catalog.length === 0) return null;

  return (
    <AddItemPanel
      products={catalog}
      categories={categoryNames}
      onAdd={(id, quantity) => void handleAdd(id, quantity)}
      disabled={disabled}
      conflictMessage={conflict}
      onDismissConflict={() => setConflict(null)}
    />
  );
}
