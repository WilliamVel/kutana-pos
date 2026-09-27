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
      trackInventory: false,
      stockUnit: "ea",
      presentation: "Unidad",
      contentMl: null,
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
    trackInventory: product.stockItemId !== null,
    stockUnit: product.stockKind === "volume" ? "ml" : "ea",
    presentation: product.stockKind === "volume" ? "Vaso" : "Unidad",
    contentMl: product.pourSizeMl,
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
    void categories
      .listAll()
      .then((list) => {
        if (!cancelled) setCategoryOptions(list);
      })
      .catch(() => {
      });
    return () => {
      cancelled = true;
    };
  }, [categories]);

  useEffect(() => {
    let cancelled = false;
    setExistingStockItem(null);

    if (!existingProduct?.stockItemId) {
      return () => {
        cancelled = true;
      };
    }
    void stock
      .findById(existingProduct.stockItemId)
      .then((item) => {
        if (!cancelled) setExistingStockItem(item);
      })
      .catch(() => {
      });

    return () => {
      cancelled = true;
    };
  }, [existingProduct, stock]);

  async function handleSubmit(values: ProductFormValues): Promise<void> {

    try {
      const existingWithSku = await products.findBySku(values.sku);
      if (existingWithSku && existingWithSku.id !== existingProduct?.id) {
        setErrors({ sku: "El SKU ya está en uso" });
        return;
      }
      const existingWithBarcode = values.barcode ? await products.findByBarcode(values.barcode) : null;
      if (existingWithBarcode && existingWithBarcode.id !== existingProduct?.id) {
        setErrors({ barcode: "El código de barras ya está en uso" });
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
        const saved = await products.save(updated, currentProduct.version);
        onSaved(saved);
        return;
      }
      const stockItem = values.trackInventory
        ? createStockItem({
            name: values.name,
            kind: values.stockKind,
            unit: values.stockKind === "volume" ? "ml" : "ea",
            quantity: values.initialStockQuantity,
            lowStockLevel: values.lowStockLevel,
          })
        : null;
      if (stockItem) {
        await stock.recordMovement(
          stockItem,
          createStockMovement({
            stockItemId: stockItem.id,
            delta: 0,
            reason: "adjustment",
            refType: "product-created",
            refId: stockItem.id,
          }),
          0,
        );
      }

      const newProduct = createProduct({
        name: values.name,
        categoryId: values.categoryId,
        sku: values.sku,
        barcode: values.barcode || null,
        description: values.description || null,
        priceCents: values.retailPriceCents,
        costPriceCents: values.costPriceCents,
        taxRateBp: 0,
        stockKind: values.stockKind,
        pourSizeMl: values.stockKind === "volume" ? values.pourSizeMl : null,
        lowStockLevel: values.trackInventory ? values.lowStockLevel : null,
        stockItemId: stockItem?.id ?? null,
      });
      const saved = await products.save(newProduct, 0);
      onSaved(saved);
    } catch {
      setErrors({ sku: "No se pudo guardar. Revisá la consola." });
    }
  }

  async function saveExistingStockIfNeeded(
    values: ProductFormValues,
    currentProduct: Product,
  ): Promise<string | null> {
    if (!values.trackInventory) {
      return null;
    }

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
      return currentProduct.stockItemId;
    }

    const newStockItem = createStockItem({
      name: values.name,
      kind: values.stockKind,
      unit: values.stockKind === "volume" ? "ml" : "ea",
      quantity: values.initialStockQuantity,
      lowStockLevel: values.lowStockLevel,
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
