import { useEffect, useMemo, useState } from "react";
import type { Category } from "@kutana/shared/catalog/model/category.js";
import type { Product } from "@kutana/shared/catalog/model/product.js";
import type { StockItem } from "@kutana/shared/inventory/model/stock-item.js";
import { useCategories, useProducts, useStock } from "../../../composition/PortsProvider.js";
import { InventoryList, type InventoryRow } from "../components/InventoryList.js";
import { computeStockDisplay, type StockDisplayStatus } from "../stock-display.js";

const PAGE_SIZE = 10;

export interface InventoryListContainerProps {
  readonly onEditProduct?: (product: Product) => void;
}

/**
 * Owns port access and all filter/search/pagination STATE. Holds no markup
 * complexity of its own — it fetches data via the composition hooks, then
 * hands fully-formed, already-formatted `InventoryRow[]` to the purely
 * presentational `InventoryList`.
 */
export function InventoryListContainer({
  onEditProduct,
}: InventoryListContainerProps = {}): JSX.Element {
  const products = useProducts();
  const categories = useCategories();
  const stock = useStock();

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [stockById, setStockById] = useState<Map<string, StockItem>>(new Map());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [stockStatusFilter, setStockStatusFilter] = useState<StockDisplayStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      const categoryList = await categories.listAll();
      if (cancelled) return;
      setAllCategories(categoryList);

      const productLists = await Promise.all(
        categoryList.map((category) =>
          products.listByCategory(category.id, { includeInactive: false }),
        ),
      );
      if (cancelled) return;
      const productList = productLists.flat();
      setAllProducts(productList);

      const stockItemIds = [
        ...new Set(
          productList
            .map((product) => product.stockItemId)
            .filter((id): id is string => id !== null),
        ),
      ];
      const stockItems = await Promise.all(stockItemIds.map((id) => stock.findById(id)));
      if (cancelled) return;
      const nextStockById = new Map<string, StockItem>();
      for (const item of stockItems) {
        if (item) nextStockById.set(item.id, item);
      }
      setStockById(nextStockById);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [products, categories, stock]);

  const categoryNameById = useMemo(
    () => new Map(allCategories.map((category) => [category.id, category.name])),
    [allCategories],
  );

  const productById = useMemo(
    () => new Map(allProducts.map((product) => [product.id, product])),
    [allProducts],
  );

  const filteredRows = useMemo<InventoryRow[]>(() => {
    const query = searchQuery.trim().toLowerCase();

    return allProducts
      .filter((product) => selectedCategoryId === null || product.categoryId === selectedCategoryId)
      .filter(
        (product) =>
          query === "" ||
          product.name.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query),
      )
      .map((product) => {
        const stockItem = product.stockItemId ? (stockById.get(product.stockItemId) ?? null) : null;
        const display = computeStockDisplay(product, stockItem);
        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          categoryName: categoryNameById.get(product.categoryId) ?? "Uncategorized",
          priceCents: product.priceCents,
          imageUrl: product.imageUrl,
          stockStatus: display.status,
          stockLabel: display.label,
        };
      })
      .filter((row) => stockStatusFilter === null || row.stockStatus === stockStatusFilter);
  }, [
    allProducts,
    selectedCategoryId,
    searchQuery,
    stockById,
    categoryNameById,
    stockStatusFilter,
  ]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice(
    (clampedPage - 1) * PAGE_SIZE,
    (clampedPage - 1) * PAGE_SIZE + PAGE_SIZE,
  );

  return (
    <InventoryList
      rows={pageRows}
      categories={allCategories.map((category) => ({ id: category.id, name: category.name }))}
      selectedCategoryId={selectedCategoryId}
      onCategoryChange={(categoryId) => {
        setSelectedCategoryId(categoryId);
        setPage(1);
      }}
      stockStatusFilter={stockStatusFilter}
      onStockStatusFilterChange={(status) => {
        setStockStatusFilter(status);
        setPage(1);
      }}
      searchQuery={searchQuery}
      onSearchQueryChange={(query) => {
        setSearchQuery(query);
        setPage(1);
      }}
      page={clampedPage}
      pageCount={pageCount}
      onPageChange={setPage}
      onEditProduct={
        onEditProduct
          ? (productId) => {
              const product = productById.get(productId);
              if (product) onEditProduct(product);
            }
          : undefined
      }
    />
  );
}
