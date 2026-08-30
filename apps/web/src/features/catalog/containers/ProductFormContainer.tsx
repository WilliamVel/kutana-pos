import { useEffect, useState } from "react";
import type { Category } from "@kutana/shared/catalog/model/category.js";
import { createProduct, type Product } from "@kutana/shared/catalog/model/product.js";
import { createStockItem } from "@kutana/shared/inventory/model/stock-item.js";
import { createStockMovement } from "@kutana/shared/inventory/model/stock-movement.js";
import { useCategories, useProducts, useStock } from "../../../composition/PortsProvider.js";
import { ProductForm, type ProductFormValues } from "../components/ProductForm.js";

export interface ProductFormContainerProps {
  /** When provided, edits this existing product; otherwise creates a new one. */
  readonly existingProduct?: Product;
  readonly onSaved: (product: Product) => void;
  readonly onCancel: () => void;
}

function toFormValues(product?: Product): ProductFormValues {
  if (!product) {
    return {
      name: "",
      categoryId: "",
      sku: "",
      barcode: "",
      stockKind: "unit",
      pourSizeMl: null,
      retailPriceCents: 0,
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
    retailPriceCents: product.priceCents,
    lowStockLevel: product.lowStockLevel,
    initialStockQuantity: 0,
    active: product.active,
  };
}

/**
 * Wires `ProductForm` to `ProductRepository` (and `StockRepository` for a
 * new product's initial stock item). Holds no markup complexity: it loads
 * categories, validates the SKU uniqueness rule client-side, and persists
 * the submitted values.
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
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({});

  useEffect(() => {
    let cancelled = false;
    void categories.listAll().then((list) => {
      if (!cancelled) setCategoryOptions(list);
    });
    return () => {
      cancelled = true;
    };
  }, [categories]);

  async function handleSubmit(values: ProductFormValues): Promise<void> {
    const existingWithSku = await products.findBySku(values.sku);
    if (existingWithSku && existingWithSku.id !== existingProduct?.id) {
      setErrors({ sku: "SKU already in use" });
      return;
    }
    setErrors({});

    if (existingProduct) {
      const updated: Product = {
        ...existingProduct,
        name: values.name,
        categoryId: values.categoryId,
        sku: values.sku,
        barcode: values.barcode || null,
        priceCents: values.retailPriceCents,
        lowStockLevel: values.lowStockLevel,
        stockKind: values.stockKind,
        pourSizeMl: values.stockKind === "volume" ? values.pourSizeMl : null,
        active: values.active,
      };
      const saved = await products.save(updated, existingProduct.version);
      onSaved(saved);
      return;
    }

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
    await stock.recordMovement(stockItem, seedMovement, 0);

    const newProduct = createProduct({
      name: values.name,
      categoryId: values.categoryId,
      sku: values.sku,
      barcode: values.barcode || null,
      priceCents: values.retailPriceCents,
      taxRateBp: 1200,
      stockKind: values.stockKind,
      pourSizeMl: values.stockKind === "volume" ? values.pourSizeMl : null,
      lowStockLevel: values.lowStockLevel,
      stockItemId: stockItem.id,
    });
    const saved = await products.save(newProduct, 0);
    onSaved(saved);
  }

  return (
    <ProductForm
      categories={categoryOptions.map((category) => ({ id: category.id, name: category.name }))}
      initialValues={toFormValues(existingProduct)}
      onSubmit={(values) => void handleSubmit(values)}
      onCancel={onCancel}
      submitLabel={existingProduct ? "Save changes" : "Create product"}
      errors={errors}
    />
  );
}
