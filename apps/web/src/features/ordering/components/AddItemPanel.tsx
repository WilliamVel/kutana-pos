import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../design-system/atoms/Button.js";
import { PriceTag } from "../../../design-system/molecules/PriceTag.js";
import styles from "./AddItemPanel.module.css";

export interface AddItemPanelProduct {
  readonly id: string;
  readonly name: string;
  /** Integer cents. */
  readonly priceCents: number;
  readonly categoryName: string;
  readonly taxRateBp: number;
  readonly pourSizeMl?: number | null;
  /** Catalog image; null falls back to a CSS placeholder tile. */
  readonly imageUrl?: string | null;
}

export interface AddItemPanelProps {
  readonly products: readonly AddItemPanelProduct[];
  readonly onAdd: (productId: string, quantity: number) => Promise<void>;
  /** Ordered category names for the tab strip; derived from products when omitted. */
  readonly categories?: readonly string[];
  /** True when the order is paid / can no longer be modified. */
  readonly disabled?: boolean;
  readonly conflictMessage?: string | null;
  readonly onDismissConflict?: () => void;
}

const ALL_TAB = "Todos";

/**
 * Purely presentational: props in, markup out, no port access. The
 * "Quick add items" rail — a search box, a category tab strip, and a grid
 * of product tiles. Each tile shows the catalog image (or a tinted
 * placeholder with the product's first letter), the name, its price, and a
 * `+` button that adds one unit.
 */
export function AddItemPanel({
  products,
  onAdd,
  categories,
  disabled = false,
  conflictMessage,
  onDismissConflict,
}: AddItemPanelProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(ALL_TAB);
  const [pendingProductIds, setPendingProductIds] = useState<Set<string>>(() => new Set());
  const [addRequestNumber, setAddRequestNumber] = useState(0);

  const categoryNames = categories ?? [...new Set(products.map((product) => product.categoryName))];
  const tabs = [ALL_TAB, ...categoryNames];

  // Client-side filter only. Real server-side search (`GET /products?q=`)
  // is a Milestone-2 concern; the container keeps passing the full list.
  const needle = query.trim().toLowerCase();
  const visible = products.filter((product) => {
    const matchesQuery = needle ? product.name.toLowerCase().includes(needle) : true;
    const matchesCategory =
      activeCategory === ALL_TAB ? true : product.categoryName === activeCategory;
    return matchesQuery && matchesCategory;
  });

  return (
    <section className={styles.panel} aria-label="Catálogo de productos">
      <h2>Catálogo</h2>

      <div className={styles.searchWrap}>
        <input
          type="search"
          className={styles.search}
          aria-label="Buscar productos"
          placeholder="Buscar productos"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query ? (
          <button
            type="button"
            className={styles.clearSearch}
            aria-label="Borrar búsqueda"
            title="Borrar búsqueda"
            onClick={(event) => {
              setQuery("");
              event.currentTarget.parentElement?.querySelector<HTMLInputElement>("input")?.focus();
            }}
          >
            ×
          </button>
        ) : null}
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Categorías de productos">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={tab === activeCategory}
            onClick={() => setActiveCategory(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {conflictMessage ? (
        <div className={styles.conflict} role="alert">
          <p>{conflictMessage}</p>
          {onDismissConflict ? (
            <Button variant="secondary" onClick={onDismissConflict}>
              Entendido — intentar de nuevo
            </Button>
          ) : null}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className={styles.noMatch}>No hay productos que coincidan.</p>
      ) : (
        <ul className={styles.grid}>
          {visible.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                className={styles.tile}
                aria-label={`Agregar ${product.name}`}
                disabled={disabled}
                onClick={async () => {
                  if (pendingProductIds.has(product.id)) return;
                  setPendingProductIds((current) => new Set(current).add(product.id));
                  try {
                    await onAdd(product.id, 1);
                    const requestNumber = addRequestNumber + 1;
                    setAddRequestNumber(requestNumber);
                    toast.success(`${product.name} agregado`, {
                      id: `product-added-${product.id}-${requestNumber}`,
                      duration: 2600,
                    });
                  } catch {
                    // The container exposes the actionable conflict/error message.
                  } finally {
                    setPendingProductIds((current) => {
                      const next = new Set(current);
                      next.delete(product.id);
                      return next;
                    });
                  }
                }}
              >
                {product.imageUrl ? (
                  <img className={styles.thumb} src={product.imageUrl} alt="" loading="lazy" />
                ) : (
                  <span className={styles.placeholder} aria-hidden="true">
                    {product.name.charAt(0)}
                  </span>
                )}
                <span className={styles.name}>{product.name}</span>
                <PriceTag cents={product.priceCents} />
                <span className={styles.add} aria-live="polite">
                  <span className={styles.addLabel}>+ Agregar</span>
                  {pendingProductIds.has(product.id) ? (
                    <span className={styles.addSpinner} aria-label="Guardando" />
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
