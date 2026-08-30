import { useId } from "react";
import { Button } from "../../../design-system/atoms/Button.js";
import { PriceTag } from "../../../design-system/molecules/PriceTag.js";
import { StatusPill } from "../../../design-system/molecules/StatusPill.js";
import type { StockDisplayStatus } from "../stock-display.js";
import styles from "./InventoryList.module.css";

export interface InventoryRow {
  readonly id: string;
  readonly name: string;
  readonly sku: string;
  readonly categoryName: string;
  /** Integer cents. */
  readonly priceCents: number;
  readonly imageUrl: string | null;
  readonly stockStatus: StockDisplayStatus;
  /** Pre-formatted by `computeStockDisplay` — a keg shows millilitres, a bottle shows a unit count. */
  readonly stockLabel: string;
}

export interface InventoryCategoryOption {
  readonly id: string;
  readonly name: string;
}

export interface InventoryListProps {
  readonly rows: readonly InventoryRow[];
  readonly categories: readonly InventoryCategoryOption[];
  readonly selectedCategoryId: string | null;
  readonly onCategoryChange: (categoryId: string | null) => void;
  readonly stockStatusFilter: StockDisplayStatus | null;
  readonly onStockStatusFilterChange: (status: StockDisplayStatus | null) => void;
  readonly searchQuery: string;
  readonly onSearchQueryChange: (query: string) => void;
  readonly page: number;
  readonly pageCount: number;
  readonly onPageChange: (page: number) => void;
}

/**
 * Purely presentational: props in, markup out, no port access. All
 * filtering/search/pagination logic lives in the container
 * (`InventoryListContainer`) — this component only renders whatever rows
 * it is handed and reports user intent upward via callbacks.
 */
export function InventoryList({
  rows,
  categories,
  selectedCategoryId,
  onCategoryChange,
  stockStatusFilter,
  onStockStatusFilterChange,
  searchQuery,
  onSearchQueryChange,
  page,
  pageCount,
  onPageChange,
}: InventoryListProps): JSX.Element {
  const categoryFieldId = useId();
  const stockFieldId = useId();

  return (
    <div>
      <div className={styles.filters}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={categoryFieldId}>
            Category
          </label>
          <select
            id={categoryFieldId}
            className={styles.select}
            value={selectedCategoryId ?? ""}
            onChange={(event) => onCategoryChange(event.target.value || null)}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={stockFieldId}>
            Stock status
          </label>
          <select
            id={stockFieldId}
            className={styles.select}
            value={stockStatusFilter ?? ""}
            onChange={(event) =>
              onStockStatusFilterChange((event.target.value || null) as StockDisplayStatus | null)
            }
          >
            <option value="">All stock levels</option>
            <option value="in-stock">In stock</option>
            <option value="low-stock">Low stock</option>
            <option value="out-of-stock">Out of stock</option>
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="inventory-search">
            Search
          </label>
          <input
            id="inventory-search"
            role="searchbox"
            className={styles.search}
            type="search"
            placeholder="Search by name or SKU"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className={styles.empty}>No products match your filters.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th aria-hidden="true" />
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={styles.row}>
                <td>
                  {row.imageUrl ? (
                    <img className={styles.image} src={row.imageUrl} alt="" />
                  ) : (
                    <div className={styles.image} aria-hidden="true" />
                  )}
                </td>
                <td>{row.name}</td>
                <td>{row.sku}</td>
                <td>{row.categoryName}</td>
                <td>
                  <PriceTag cents={row.priceCents} />
                </td>
                <td>
                  <StatusPill status={row.stockStatus} /> <span>{row.stockLabel}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className={styles.pagination}>
        <Button variant="secondary" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Previous page
        </Button>
        <span>
          Page {page} of {pageCount}
        </span>
        <Button
          variant="secondary"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
        >
          Next page
        </Button>
      </div>
    </div>
  );
}
