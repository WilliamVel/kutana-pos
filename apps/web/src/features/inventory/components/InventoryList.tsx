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
  readonly onEditProduct?: (productId: string) => void;
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
  onEditProduct,
}: InventoryListProps): JSX.Element {
  const categoryFieldId = useId();
  const stockFieldId = useId();
  const searchFieldId = useId();
  const productCount = new Intl.NumberFormat().format(rows.length);

  return (
    <section className={styles.screen} aria-labelledby="inventory-heading">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Catálogo</p>
          <h2 id="inventory-heading">Productos</h2>
          <p>Buscá, filtrá y revisá el estado del stock antes de vender.</p>
        </div>
        <div className={styles.summaryCard} aria-live="polite">
          <strong>{productCount}</strong>
          <span>{rows.length === 1 ? "Producto visible" : "Productos visibles"}</span>
        </div>
      </header>

      <div className={styles.filters} role="search" aria-label="Filtros de productos">
        <div className={styles.field}>
          <label className={styles.label} htmlFor={searchFieldId}>
            Buscar
          </label>
          <input
            id={searchFieldId}
            name="inventory-search"
            autoComplete="off"
            role="searchbox"
            className={styles.search}
            type="search"
            placeholder="Buscar por nombre o SKU…"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={categoryFieldId}>
            Categoría
          </label>
          <select
            id={categoryFieldId}
            name="inventory-category"
            autoComplete="off"
            className={styles.select}
            value={selectedCategoryId ?? ""}
            onChange={(event) => onCategoryChange(event.target.value || null)}
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={stockFieldId}>
            Estado de stock
          </label>
          <select
            id={stockFieldId}
            name="inventory-stock-status"
            autoComplete="off"
            className={styles.select}
            value={stockStatusFilter ?? ""}
            onChange={(event) =>
              onStockStatusFilterChange((event.target.value || null) as StockDisplayStatus | null)
            }
          >
            <option value="">Todos los niveles de stock</option>
            <option value="in-stock">Con stock</option>
            <option value="low-stock">Stock bajo</option>
            <option value="out-of-stock">Sin stock</option>
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty} role="status">
          <h3>No hay productos que coincidan</h3>
          <p>No hay productos que coincidan con los filtros.</p>
          <p>Limpiá la búsqueda o elegí otra categoría o estado de stock.</p>
        </div>
      ) : (
        <div className={styles.tableShell}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th aria-hidden="true" />
                <th>Nombre</th>
                <th>SKU</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                {onEditProduct ? <th>Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={styles.row}>
                  <td>
                    {row.imageUrl ? (
                      <img
                        className={styles.image}
                        src={row.imageUrl}
                        alt=""
                        width="48"
                        height="48"
                        loading="lazy"
                      />
                    ) : (
                      <div className={styles.image} aria-hidden="true">
                        {row.name.charAt(0)}
                      </div>
                    )}
                  </td>
                  <td>
                    <strong className={styles.productName}>{row.name}</strong>
                  </td>
                  <td>
                    <code className={styles.sku} translate="no">
                      {row.sku}
                    </code>
                  </td>
                  <td>{row.categoryName}</td>
                  <td className={styles.priceCell}>
                    <PriceTag cents={row.priceCents} />
                  </td>
                  <td>
                    <div className={styles.stockCell}>
                      <StatusPill status={row.stockStatus} />
                      <span>{row.stockLabel}</span>
                    </div>
                  </td>
                  {onEditProduct ? (
                    <td className={styles.actionCell}>
                      <Button variant="secondary" onClick={() => onEditProduct(row.id)}>
                        Editar
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <nav className={styles.pagination} aria-label="Páginas de productos">
        <Button variant="secondary" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Anterior
        </Button>
        <span aria-live="polite">
          Página {page} de {pageCount}
        </span>
        <Button
          variant="secondary"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
        >
          Siguiente
        </Button>
      </nav>
    </section>
  );
}
