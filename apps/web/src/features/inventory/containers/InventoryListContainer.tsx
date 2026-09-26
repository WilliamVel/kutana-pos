import { useEffect, useMemo, useState } from "react";
import type { Category } from "@kutana/shared/catalog/model/category.js";
import { withActive, type Product } from "@kutana/shared/catalog/model/product.js";
import type { StockItem } from "@kutana/shared/inventory/model/stock-item.js";
import { useCategories, useProducts, useStock } from "../../../composition/PortsProvider.js";
import { useDebouncedValue } from "../../../shared/useDebouncedValue.js";
import { InventoryList, type InventoryRow } from "../components/InventoryList.js";
import { computeStockDisplay, type StockDisplayStatus } from "../stock-display.js";

const PAGE_SIZE = 10;
const urlState = (): { search: string; category: string | null; stock: StockDisplayStatus | null; page: number } => {
  const params = new URLSearchParams(window.location.search);
  const page = Number(params.get("productsPage"));
  return {
    search: params.get("productsSearch") ?? "",
    category: params.get("productsCategory"),
    stock: (params.get("productsStock") as StockDisplayStatus | null) || null,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
};

export interface InventoryListContainerProps {
  readonly onEditProduct?: (product: Product) => void;
  readonly onAddProduct?: () => void;
  readonly onManageCategories?: () => void;
}

export function InventoryListContainer({
  onEditProduct,
  onAddProduct,
  onManageCategories,
}: InventoryListContainerProps = {}): JSX.Element {
  const products = useProducts();
  const categories = useCategories();
  const stock = useStock();
  const initial = useMemo(urlState, []);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [stockById, setStockById] = useState<Map<string, StockItem>>(new Map());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(initial.category);
  const [stockStatusFilter, setStockStatusFilter] = useState<StockDisplayStatus | null>(initial.stock);
  const [searchQuery, setSearchQuery] = useState(initial.search);
  const debouncedSearchQuery = useDebouncedValue(searchQuery);
  const [page, setPage] = useState(initial.page);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      setLoadError(false);
      try {
        const categoryList = await categories.listAll();
        if (cancelled) return;
        setAllCategories(categoryList);
        const productList = (await Promise.all(
          categoryList.map((category) => products.listByCategory(category.id, { includeInactive: false })),
        )).flat();
        if (cancelled) return;
        setAllProducts(productList);
        const stockItemIds = [...new Set(productList.map((p) => p.stockItemId).filter((id): id is string => id !== null))];
        const stockItems = await Promise.all(stockItemIds.map((id) => stock.findById(id)));
        if (cancelled) return;
        setStockById(new Map(stockItems.filter((item): item is StockItem => item !== null).map((item) => [item.id, item])));
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [products, categories, stock]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const values: Record<string, string | null> = {
      productsSearch: searchQuery || null,
      productsCategory: selectedCategoryId,
      productsStock: stockStatusFilter,
      productsPage: page > 1 ? String(page) : null,
    };
    Object.entries(values).forEach(([key, value]) => value ? params.set(key, value) : params.delete(key));
    window.history.replaceState({}, "", `${window.location.pathname}${params.toString() ? `?${params}` : ""}`);
  }, [searchQuery, selectedCategoryId, stockStatusFilter, page]);

  const categoryNameById = useMemo(() => new Map(allCategories.map((category) => [category.id, category.name])), [allCategories]);
  const productById = useMemo(() => new Map(allProducts.map((product) => [product.id, product])), [allProducts]);
  const filteredRows = useMemo<InventoryRow[]>(() => {
    const query = debouncedSearchQuery.trim().toLowerCase();
    return allProducts
      .filter((p) => selectedCategoryId === null || p.categoryId === selectedCategoryId)
      .filter((p) => !query || p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query))
      .map((product) => {
        const display = computeStockDisplay(product, product.stockItemId ? stockById.get(product.stockItemId) ?? null : null);
        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          categoryName: categoryNameById.get(product.categoryId) ?? "Sin categoría",
          priceCents: product.priceCents,
          imageUrl: product.imageUrl,
          presentation: product.pourSizeMl ? `${product.stockKind === "volume" ? "Vaso" : ""} ${product.pourSizeMl >= 1000 ? `${product.pourSizeMl / 1000} L` : `${product.pourSizeMl} ml`}`.trim() : null,
          stockStatus: display.status,
          stockLabel: display.label,
        };
      })
      .filter((row) => stockStatusFilter === null || row.stockStatus === stockStatusFilter);
  }, [allProducts, selectedCategoryId, debouncedSearchQuery, stockById, categoryNameById, stockStatusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);
  useEffect(() => { if (page !== clampedPage) setPage(clampedPage); }, [page, clampedPage]);

  const deleteProduct = async (productId: string): Promise<void> => {
    const product = productById.get(productId);
    if (!product) return;
    const saved = await products.save(withActive(product, false), product.version);
    setAllProducts((current) => current.filter((item) => item.id !== saved.id));
  };

  return (
    <InventoryList
      rows={pageRows}
      totalCount={filteredRows.length}
      catalogCount={allProducts.length}
      loading={loading}
      error={loadError}
      categories={allCategories.map((category) => ({ id: category.id, name: category.name }))}
      selectedCategoryId={selectedCategoryId}
      onCategoryChange={(value) => { setSelectedCategoryId(value); setPage(1); }}
      stockStatusFilter={stockStatusFilter}
      onStockStatusFilterChange={(value) => { setStockStatusFilter(value); setPage(1); }}
      searchQuery={searchQuery}
      onSearchQueryChange={(value) => { setSearchQuery(value); setPage(1); }}
      page={clampedPage}
      pageSize={PAGE_SIZE}
      pageCount={pageCount}
      onPageChange={(value) => { setPage(value); document.getElementById("inventory-results")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
      onEditProduct={onEditProduct ? (id) => { const product = productById.get(id); if (product) onEditProduct(product); } : undefined}
      onDeleteProduct={deleteProduct}
      onRetry={() => window.location.reload()}
      onAddProduct={onAddProduct}
      onManageCategories={onManageCategories}
    />
  );
}
