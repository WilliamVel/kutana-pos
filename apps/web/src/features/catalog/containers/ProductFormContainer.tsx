import { useEffect, useState } from "react";
import type { Category } from "@kutana/shared/catalog/model/category.js";
import { createProduct, type Product } from "@kutana/shared/catalog/model/product.js";
import { createStockItem, type StockItem } from "@kutana/shared/inventory/model/stock-item.js";
import { createStockMovement } from "@kutana/shared/inventory/model/stock-movement.js";
import { useCategories, useProducts, useStock } from "../../../composition/PortsProvider.js";
import { ProductForm, type ProductFormValues } from "../components/ProductForm.js";

export interface ProductFormContainerProps {
  /** When provided, edits this existing product; otherwise creates a new one. */
  readonly existingProduct?: Product;
  readonly onSaved: (product: Product) => void;
  readonly onCancel: () => void;
}

function toFormValues(product?: Product, stockItem?: StockItem | null): ProductFormValues {
  if (!product) {
    return {
      name: "",
      categoryId: "",
      sku: "",
      barcode: "",
      stockKind: "unit",
      pourSizeMl: null,
      description: "",
      retailPriceCents: 0,
      costPriceCents: null,
      lowStockLevel: null,
      initialStockQuantity: 0,
      active: true,
    };
  }

  return {
    name: product.name,
    categoryId: product.categoryId,
    sku: product.sku,
    barcode: product.barcode ?? "",
    stockKind: product.stockKind,
    pourSizeMl: product.pourSizeMl,
    description: product.description ?? "",
    retailPriceCents: product.priceCents,
    costPriceCents: product.costPriceCents,
    lowStockLevel: stockItem?.lowStockLevel ?? product.lowStockLevel,
    initialStockQuantity: stockItem?.quantity ?? 0,
    active: product.active,
  };
}

/**
 * Wires `ProductForm` to `ProductRepository` (and `StockRepository` for a
 * product's stock item). Holds no markup complexity: it loads categories,
 * validates the SKU uniqueness rule client-side, and persists submitted values.
 */
export function ProductFormContainer({
  existingProduct,
  onSaved,
  onCancel,
}: ProductFormContainerProps): JSX.Element {
  const products = useProducts();
  const categories = useCategories();
  const stock = useStock();

  const [categoryOptions, setCategoryOptions] = useState<Category[]>([]);
  const [existingStockItem, setExistingStockItem] = useState<StockItem | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({});

  useEffect(() => {
    let cancelled = false;
    console.info("[ProductFormContainer] Loading categories");
    void categories
      .listAll()
      .then((list) => {
        console.info("[ProductFormContainer] Categories loaded", { count: list.length });
        if (!cancelled) setCategoryOptions(list);
      })
      .catch((error: unknown) => {
        console.error("[ProductFormContainer] Failed to load categories", error);
      });
    return () => {
      cancelled = true;
    };
  }, [categories]);

  useEffect(() => {
    let cancelled = false;
    setExistingStockItem(null);

    if (!existingProduct?.stockItemId) {
      console.info("[ProductFormContainer] Existing product has no stock item", {
        id: existingProduct?.id ?? null,
      });
      return () => {
        cancelled = true;
      };
    }

    console.info("[ProductFormContainer] Loading existing stock item", {
      productId: existingProduct.id,
      stockItemId: existingProduct.stockItemId,
    });
    void stock
      .findById(existingProduct.stockItemId)
      .then((item) => {
        console.info("[ProductFormContainer] Existing stock item loaded", {
          stockItemId: existingProduct.stockItemId,
          found: Boolean(item),
          quantity: item?.quantity ?? null,
          version: item?.version ?? null,
        });
        if (!cancelled) setExistingStockItem(item);
      })
      .catch((error: unknown) => {
        console.error("[ProductFormContainer] Failed to load existing stock item", error);
      });

    return () => {
      cancelled = true;
    };
  }, [existingProduct, stock]);

  async function handleSubmit(values: ProductFormValues): Promise<void> {
    console.info("[ProductFormContainer] Submit", {
      mode: existingProduct ? "edit" : "create",
      id: existingProduct?.id ?? null,
      sku: values.sku,
      categoryId: values.categoryId,
      stockKind: values.stockKind,
      pourSizeMl: values.pourSizeMl,
      initialStockQuantity: values.initialStockQuantity,
      active: values.active,
    });

    try {
      console.info("[ProductFormContainer] Checking SKU", { sku: values.sku });
      const existingWithSku = await products.findBySku(values.sku);
      console.info("[ProductFormContainer] SKU check result", {
        requestedSku: values.sku,
        foundId: existingWithSku?.id ?? null,
        foundVersion: existingWithSku?.version ?? null,
      });
      if (existingWithSku && existingWithSku.id !== existingProduct?.id) {
        console.warn("[ProductFormContainer] Duplicate SKU blocked", {
          requestedSku: values.sku,
          foundId: existingWithSku.id,
          editingId: existingProduct?.id ?? null,
        });
        setErrors({ sku: "El SKU ya está en uso" });
        return;
      }
      setErrors({});

      if (existingProduct) {
        const currentProduct =
          existingWithSku?.id === existingProduct.id
            ? existingWithSku
            : ((await products.findById(existingProduct.id)) ?? existingProduct);
        const stockItemId = await saveExistingStockIfNeeded(values, currentProduct);
        const updated: Product = {
          ...currentProduct,
          name: values.name,
          categoryId: values.categoryId,
          sku: values.sku,
          barcode: values.barcode || null,
          description: values.description || null,
          priceCents: values.retailPriceCents,
          costPriceCents: values.costPriceCents,
          lowStockLevel: values.lowStockLevel,
          stockKind: values.stockKind,
          pourSizeMl: values.stockKind === "volume" ? values.pourSizeMl : null,
          stockItemId,
          active: values.active,
        };
        console.info("[ProductFormContainer] Saving existing product", {
          id: updated.id,
          sku: updated.sku,
          stockItemId: updated.stockItemId,
          expectedVersion: currentProduct.version,
        });
        const saved = await products.save(updated, currentProduct.version);
        console.info("[ProductFormContainer] Product saved", {
          id: saved.id,
          sku: saved.sku,
          version: saved.version,
          stockItemId: saved.stockItemId,
        });
        onSaved(saved);
        return;
      }

      console.info("[ProductFormContainer] Creating stock item for new product");
      const stockItem = createStockItem({
        name: values.name,
        kind: values.stockKind,
        unit: values.stockKind === "volume" ? "ml" : "ea",
        quantity: values.initialStockQuantity,
        lowStockLevel: values.lowStockLevel,
      });
      const seedMovement = createStockMovement({
        stockItemId: stockItem.id,
        delta: 0,
        reason: "adjustment",
        refType: "product-created",
        refId: stockItem.id,
      });
      console.info("[ProductFormContainer] Recording initial stock movement", {
        stockItemId: stockItem.id,
      });
      await stock.recordMovement(stockItem, seedMovement, 0);

      const newProduct = createProduct({
        name: values.name,
        categoryId: values.categoryId,
        sku: values.sku,
        barcode: values.barcode || null,
        description: values.description || null,
        priceCents: values.retailPriceCents,
        costPriceCents: values.costPriceCents,
        taxRateBp: 1200,
        stockKind: values.stockKind,
        pourSizeMl: values.stockKind === "volume" ? values.pourSizeMl : null,
        lowStockLevel: values.lowStockLevel,
        stockItemId: stockItem.id,
      });
      console.info("[ProductFormContainer] Saving new product", {
        id: newProduct.id,
        sku: newProduct.sku,
      });
      const saved = await products.save(newProduct, 0);
      console.info("[ProductFormContainer] Product created", {
        id: saved.id,
        sku: saved.sku,
        version: saved.version,
      });
      onSaved(saved);
    } catch (error) {
      console.error("[ProductFormContainer] Submit failed", error);
      setErrors({ sku: "No se pudo guardar. Revisá la consola." });
    }
  }

  async function saveExistingStockIfNeeded(
    values: ProductFormValues,
    currentProduct: Product,
  ): Promise<string | null> {
    if (existingStockItem) {
      const nextStockItem: StockItem = {
        ...existingStockItem,
        name: values.name,
        kind: values.stockKind,
        unit: values.stockKind === "volume" ? "ml" : "ea",
        quantity: values.initialStockQuantity,
        lowStockLevel: values.lowStockLevel,
      };
      const delta = nextStockItem.quantity - existingStockItem.quantity;
      console.info("[ProductFormContainer] Updating existing stock item", {
        stockItemId: nextStockItem.id,
        previousQuantity: existingStockItem.quantity,
        nextQuantity: nextStockItem.quantity,
        delta,
        expectedVersion: existingStockItem.version,
      });
      const savedStockItem = await stock.recordMovement(
        nextStockItem,
        createStockMovement({
          stockItemId: nextStockItem.id,
          delta,
          reason: "adjustment",
          refType: "product-edited",
          refId: currentProduct.id,
        }),
        existingStockItem.version,
      );
      setExistingStockItem(savedStockItem);
      return savedStockItem.id;
    }

    if (values.initialStockQuantity <= 0 && values.lowStockLevel === null) {
      console.info("[ProductFormContainer] Skipping stock item creation for existing product", {
        id: currentProduct.id,
        initialStockQuantity: values.initialStockQuantity,
      });
      return currentProduct.stockItemId;
    }

    const newStockItem = createStockItem({
      name: values.name,
      kind: values.stockKind,
      unit: values.stockKind === "volume" ? "ml" : "ea",
      quantity: values.initialStockQuantity,
      lowStockLevel: values.lowStockLevel,
    });
    console.info("[ProductFormContainer] Creating stock item for existing product", {
      productId: currentProduct.id,
      stockItemId: newStockItem.id,
      quantity: newStockItem.quantity,
    });
    const savedStockItem = await stock.recordMovement(
      newStockItem,
      createStockMovement({
        stockItemId: newStockItem.id,
        delta: 0,
        reason: "adjustment",
        refType: "product-edited",
        refId: currentProduct.id,
      }),
      0,
    );
    setExistingStockItem(savedStockItem);
    return savedStockItem.id;
  }

  return (
    <ProductForm
      key={`${existingProduct?.id ?? "new"}-${existingStockItem?.id ?? "no-stock"}-${existingStockItem?.version ?? 0}`}
      categories={categoryOptions.map((category) => ({ id: category.id, name: category.name }))}
      initialValues={toFormValues(existingProduct, existingStockItem)}
      onSubmit={(values) => void handleSubmit(values)}
      onCancel={onCancel}
      submitLabel={existingProduct ? "Guardar cambios" : "Crear producto"}
      errors={errors}
    />
  );
}
