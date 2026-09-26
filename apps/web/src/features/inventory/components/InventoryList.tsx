import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../../design-system/atoms/Button.js";
import { Icon } from "../../../design-system/atoms/Icon.js";
import { PriceTag } from "../../../design-system/molecules/PriceTag.js";
import { StatusPill } from "../../../design-system/molecules/StatusPill.js";
import type { StockDisplayStatus } from "../stock-display.js";
import styles from "./InventoryList.module.css";

export interface InventoryRow {
  readonly id: string;
  readonly name: string;
  readonly sku: string;
  readonly categoryName: string;
  readonly priceCents: number;
  readonly imageUrl: string | null;
  readonly presentation?: string | null;
  readonly stockStatus: StockDisplayStatus;
  readonly stockLabel: string;
}
export interface InventoryCategoryOption {
  readonly id: string;
  readonly name: string;
}
export interface InventoryListProps {
  readonly rows: readonly InventoryRow[];
  readonly totalCount?: number;
  readonly catalogCount?: number;
  readonly loading?: boolean;
  readonly error?: boolean;
  readonly categories: readonly InventoryCategoryOption[];
  readonly selectedCategoryId: string | null;
  readonly onCategoryChange: (value: string | null) => void;
  readonly stockStatusFilter: StockDisplayStatus | null;
  readonly onStockStatusFilterChange: (value: StockDisplayStatus | null) => void;
  readonly searchQuery: string;
  readonly onSearchQueryChange: (value: string) => void;
  readonly page: number;
  readonly pageSize?: number;
  readonly pageCount: number;
  readonly onPageChange: (page: number) => void;
  readonly onEditProduct?: (id: string) => void;
  readonly onDeleteProduct?: (id: string) => Promise<void>;
  readonly onRetry?: () => void;
  readonly onAddProduct?: () => void;
  readonly onManageCategories?: () => void;
}

const stockLabels: Record<StockDisplayStatus, string> = {
  "in-stock": "Con stock",
  "low-stock": "Stock bajo",
  "out-of-stock": "Sin stock",
  "no-stock-control": "Sin control",
};
const countText = (count: number): string =>
  `${new Intl.NumberFormat("es-AR").format(count)} ${count === 1 ? "producto" : "productos"}`;

export function InventoryList({
  rows,
  totalCount,
  catalogCount,
  loading,
  error,
  categories,
  selectedCategoryId,
  onCategoryChange,
  stockStatusFilter,
  onStockStatusFilterChange,
  searchQuery,
  onSearchQueryChange,
  page,
  pageSize = 10,
  pageCount,
  onPageChange,
  onEditProduct,
  onDeleteProduct,
  onRetry,
  onAddProduct,
  onManageCategories,
}: InventoryListProps): JSX.Element {
  const resultCount = totalCount ?? rows.length;
  const catalogTotal = catalogCount ?? rows.length;
  const isLoading = loading ?? false;
  const hasError = error ?? false;
  const categoryId = useId();
  const stockId = useId();
  const searchId = useId();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const media = window.matchMedia("(max-width: 48rem)");
    const update = (): void => setIsMobile(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  const hasFilters = Boolean(searchQuery || selectedCategoryId || stockStatusFilter);
  const activeFilterCount =
    Number(Boolean(selectedCategoryId)) + Number(Boolean(stockStatusFilter));
  const from = resultCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = resultCount === 0 ? 0 : Math.min(page * pageSize, resultCount);
  const categoryName = categories.find((category) => category.id === selectedCategoryId)?.name;
  const clearFilters = (): void => {
    onSearchQueryChange("");
    onCategoryChange(null);
    onStockStatusFilterChange(null);
    setFiltersOpen(false);
  };
  const deleteRow = async (row: InventoryRow): Promise<void> => {
    if (!onDeleteProduct || !window.confirm(`¿Eliminar “${row.name}”? Esta acción es permanente.`))
      return;
    setDeletingId(row.id);
    try {
      await onDeleteProduct(row.id);
      setNotice(`Producto “${row.name}” eliminado.`);
    } catch {
      setNotice(`No se pudo eliminar “${row.name}”.`);
    } finally {
      setDeletingId(null);
    }
  };
  const productVisual = (row: InventoryRow): JSX.Element =>
    row.imageUrl ? (
      <img
        className={styles.avatar}
        src={row.imageUrl}
        alt=""
        width="42"
        height="42"
        loading="lazy"
      />
    ) : (
      <span className={styles.avatar} aria-hidden="true">
        {row.name.charAt(0)}
      </span>
    );

  return (
    <section className={styles.screen} aria-labelledby="inventory-heading">
      <header className={styles.header}>
        <div className={styles.headingCopy}>
          <p className={styles.eyebrow}>Catálogo</p>
          <h2 id="inventory-heading">Productos</h2>
          <p>Gestioná tu catálogo y revisá el estado del stock.</p>
        </div>
        <div className={styles.inventoryActions} aria-label="Acciones de catálogo">
          {onManageCategories ? (
            <Button variant="secondary" onClick={onManageCategories}>
              <Icon name="folder" size={18} />
              Categorías
            </Button>
          ) : null}
          {onAddProduct ? (
            <Button onClick={onAddProduct}>
              <Icon name="plus" size={18} />
              Agregar producto
            </Button>
          ) : null}
        </div>
      </header>

      <div className={styles.filters} role="search" aria-label="Filtros de productos">
        <div className={styles.searchWrap}>
          <label className={styles.srOnly} htmlFor={searchId}>
            Buscar por nombre o SKU
          </label>
          <Icon name="search" size={19} />
          <input
            id={searchId}
            className={styles.search}
            type="search"
            placeholder="Buscar por nombre o SKU…"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
          {searchQuery ? (
            <button
              type="button"
              className={styles.clearButton}
              aria-label="Borrar búsqueda"
              title="Borrar búsqueda"
              onClick={(event) => {
                onSearchQueryChange("");
                event.currentTarget.parentElement
                  ?.querySelector<HTMLInputElement>("input")
                  ?.focus();
              }}
            >
              <Icon name="close" size={16} />
            </button>
          ) : null}
        </div>
        <div className={styles.desktopFilters}>
          <label className={styles.srOnly} htmlFor={categoryId}>
            Categoría
          </label>
          <select
            id={categoryId}
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
          <label className={styles.srOnly} htmlFor={stockId}>
            Estado de stock
          </label>
          <select
            id={stockId}
            className={styles.select}
            value={stockStatusFilter ?? ""}
            onChange={(event) =>
              onStockStatusFilterChange((event.target.value || null) as StockDisplayStatus | null)
            }
          >
            <option value="">Todos los stocks</option>
            {Object.entries(stockLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className={styles.filterButton}
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <span>Filtros</span>
          {activeFilterCount > 0 ? (
            <span className={styles.filterCount}>{activeFilterCount}</span>
          ) : null}
        </button>
        {filtersOpen ? (
          <div className={styles.mobileFilterPanel}>
            <label htmlFor={`${categoryId}-mobile`}>Categoría</label>
            <select
              id={`${categoryId}-mobile`}
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
            <label htmlFor={`${stockId}-mobile`}>Estado de stock</label>
            <select
              id={`${stockId}-mobile`}
              className={styles.select}
              value={stockStatusFilter ?? ""}
              onChange={(event) =>
                onStockStatusFilterChange((event.target.value || null) as StockDisplayStatus | null)
              }
            >
              <option value="">Todos los stocks</option>
              {Object.entries(stockLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {hasFilters ? (
        <div className={styles.filterBar}>
          <span className={styles.filterHint}>Filtros activos</span>
          {searchQuery ? (
            <button type="button" className={styles.chip} onClick={() => onSearchQueryChange("")}>
              “{searchQuery}” <Icon name="close" size={14} />
            </button>
          ) : null}
          {categoryName ? (
            <button type="button" className={styles.chip} onClick={() => onCategoryChange(null)}>
              {categoryName} <Icon name="close" size={14} />
            </button>
          ) : null}
          {stockStatusFilter ? (
            <button
              type="button"
              className={styles.chip}
              onClick={() => onStockStatusFilterChange(null)}
            >
              {stockLabels[stockStatusFilter]} <Icon name="close" size={14} />
            </button>
          ) : null}
          <button type="button" className={styles.clearFilters} onClick={clearFilters}>
            Limpiar filtros
          </button>
        </div>
      ) : null}

      <div className={styles.resultsHeader} id="inventory-results" aria-live="polite">
        <div>
          <h3>{hasFilters ? `${countText(resultCount)} encontrados` : countText(resultCount)}</h3>
          <span>
            Mostrando {from}–{to}
          </span>
        </div>
      </div>
      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}
      {hasError ? (
        <div className={styles.empty}>
          <h3>No pudimos cargar los productos</h3>
          <p>Revisá tu conexión e intentá nuevamente.</p>
          {onRetry ? (
            <Button variant="secondary" onClick={onRetry}>
              Reintentar
            </Button>
          ) : null}
        </div>
      ) : isLoading ? (
        <div className={styles.loading} aria-label="Cargando productos">
          {[1, 2, 3, 4].map((item) => (
            <div className={styles.skeletonRow} key={item} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className={styles.empty} role="status">
          <h3>
            {catalogTotal === 0
              ? "Todavía no hay productos"
              : "No encontramos productos con estos filtros"}
          </h3>
          <p>
            {catalogTotal === 0
              ? "Agregá tu primer producto para comenzar a vender."
              : "Probá quitar algún filtro para ampliar la búsqueda."}
          </p>
          {catalogTotal === 0 && onAddProduct ? (
            <Button onClick={onAddProduct}>Agregar primer producto</Button>
          ) : null}
          {catalogTotal > 0 && hasFilters ? (
            <Button variant="secondary" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          ) : null}
        </div>
      ) : (
        <div className={styles.resultsShell}>
          {!isMobile ? (
            <div className={`${styles.tableShell} ${styles.desktopOnly}`}>
              <table className={styles.table}>
                <caption className={styles.srOnly}>Lista de productos</caption>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>SKU</th>
                    <th>Categoría</th>
                    <th className={styles.number}>Precio</th>
                    <th>Stock</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className={styles.productCell}>
                          {productVisual(row)}
                          <span>
                            <strong>{row.name}</strong>
                            {row.presentation ? <small>{row.presentation}</small> : null}
                          </span>
                        </div>
                      </td>
                      <td>
                        <code className={styles.sku} title={row.sku}>
                          {row.sku}
                        </code>
                      </td>
                      <td>{row.categoryName}</td>
                      <td className={styles.number}>
                        <PriceTag cents={row.priceCents} />
                      </td>
                      <td>
                        <div className={styles.stockCell}>
                          <StatusPill status={row.stockStatus} />
                          {row.stockStatus === "no-stock-control" ? null : (
                            <span>{row.stockLabel}</span>
                          )}
                        </div>
                      </td>
                      <td className={styles.actionCell}>
                        <ProductActions
                          row={row}
                          onEdit={onEditProduct}
                          onDelete={onDeleteProduct ? () => void deleteRow(row) : undefined}
                          deleting={deletingId === row.id}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ul className={`${styles.mobileList} ${styles.mobileOnly}`} aria-label="Productos">
              {rows.map((row) => (
                <li className={styles.card} key={row.id}>
                  <div className={styles.cardHeader}>
                    {productVisual(row)}
                    <div className={styles.cardTitle}>
                      <strong>{row.name}</strong>
                      {row.presentation ? <small>{row.presentation}</small> : null}
                    </div>
                    <span className={styles.cardPrice}><PriceTag cents={row.priceCents} /></span>
                    <ProductActions
                      row={row}
                      onEdit={onEditProduct}
                      onDelete={onDeleteProduct ? () => void deleteRow(row) : undefined}
                      deleting={deletingId === row.id}
                    />
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.stockCell}>
                      <StatusPill status={row.stockStatus} />
                      {row.stockStatus === "no-stock-control" ? null : (
                        <span>{row.stockLabel}</span>
                      )}
                    </div>
                    <span>{row.categoryName}</span>
                    <span className={styles.cardSku}>
                      SKU: <code title={row.sku}>{row.sku}</code>
                    </span>
                  </div>
                  {onEditProduct ? (
                    <button
                      type="button"
                      className={styles.editLink}
                      onClick={() => onEditProduct(row.id)}
                    >
                      Editar producto
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <footer className={styles.paginationFooter}>
            <span>
              Mostrando {from}–{to} de {resultCount}
            </span>
            {pageCount > 1 ? (
              <nav className={styles.pagination} aria-label="Páginas de productos">
                <button
                  type="button"
                  className={styles.pageButton}
                  onClick={() => onPageChange(page - 1)}
                  disabled={page <= 1}
                  aria-label="Página anterior"
                >
                  <Icon name="arrow-left" size={20} />
                </button>
                <span aria-current="page">
                  Página {page} de {pageCount}
                </span>
                <button
                  type="button"
                  className={styles.pageButton}
                  onClick={() => onPageChange(page + 1)}
                  disabled={page >= pageCount}
                  aria-label="Página siguiente"
                >
                  <Icon name="arrow-right" size={20} />
                </button>
              </nav>
            ) : null}
          </footer>
        </div>
      )}
    </section>
  );
}

interface ProductActionsProps {
  readonly row: InventoryRow;
  readonly onEdit?: (id: string) => void;
  readonly onDelete?: () => void;
  readonly deleting: boolean;
}

function ProductActions({ row, onEdit, onDelete, deleting }: ProductActionsProps): JSX.Element {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const closeOnOutside = (event: PointerEvent): void => {
      if (
        event.target instanceof Node &&
        !buttonRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutside);
    requestAnimationFrame(() =>
      menuRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus(),
    );
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutside);
    };
  }, [open]);

  const toggleMenu = (): void => {
    if (open) {
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuWidth = 144;
    setPosition({
      top: Math.min(rect.bottom + 8, window.innerHeight - 56),
      left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)),
    });
    setOpen(true);
  };

  const menuStyle: CSSProperties = { position: "fixed", top: position.top, left: position.left };
  return (
    <div className={styles.actions}>
      {onEdit ? (
        <button
          type="button"
          className={styles.iconButton}
          aria-label={`Editar producto ${row.name}`}
          title="Editar producto"
          onClick={() => onEdit(row.id)}
        >
          <Icon name="edit" size={18} />
        </button>
      ) : null}
      {onDelete ? (
        <button
          ref={buttonRef}
          type="button"
          className={styles.iconButton}
          aria-label={`Más acciones para ${row.name}`}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          title="Más acciones"
          onClick={toggleMenu}
        >
          <Icon name="more" size={20} />
        </button>
      ) : null}
      {open && onDelete
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              className={styles.menu}
              style={menuStyle}
              role="menu"
              aria-label={`Acciones de ${row.name}`}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  buttonRef.current?.focus();
                  onDelete();
                }}
                disabled={deleting}
              >
                <Icon name="trash" size={16} />
                Eliminar
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
