import { useMemo, useState, type ReactNode } from "react";
import type { OrderStatus } from "../../../design-system/molecules/StatusPill.js";
import { PriceTag } from "../../../design-system/molecules/PriceTag.js";
import { StatusPill } from "../../../design-system/molecules/StatusPill.js";
import type { OrdersOverviewLoadState } from "../containers/OrdersOverviewContainer.js";
import styles from "./OrdersOverview.module.css";

export interface OrdersOverviewRow {
  readonly tableId: string;
  readonly tableLabel: string;
  readonly status: OrderStatus;
  readonly itemCount: number;
  /** Integer cents — current balance remaining. */
  readonly totalCents: number;
  /** Integer cents already paid through personal accounts. */
  readonly paidCents?: number;
  /** Integer cents before partial payments. */
  readonly originalTotalCents?: number;
  readonly openedAt: string;
}

export interface OrdersOverviewProps {
  readonly rows: readonly OrdersOverviewRow[];
  readonly selectedTableId: string | null;
  readonly onSelectTable: (tableId: string) => void;
  readonly onRemoveEmptyOrder?: (tableId: string) => void;
  readonly onNewOrder?: () => void;
  readonly newOrder?: ReactNode;
  readonly loadError?: string | null;
  readonly loadState?: OrdersOverviewLoadState;
}

/**
 * Purely presentational: props in, markup out, no port access, no
 * `OrderEvents` subscription — realtime updates are the container's job
 * (`OrdersOverviewContainer`), which re-renders this component with fresh
 * rows whenever the mock `OrderEvents` emitter fires.
 */
export function OrdersOverview({
  rows,
  selectedTableId,
  onSelectTable,
  onRemoveEmptyOrder = () => {},
  onNewOrder,
  newOrder,
  loadError = null,
  loadState = rows.length === 0 ? "empty" : "success",
}: OrdersOverviewProps): JSX.Element {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "in-review" | "paid">("all");
  const filteredRows = useMemo(() => rows.filter((row) => {
    const matchesQuery = row.tableLabel.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim());
    const matchesFilter = filter === "all" || (filter === "in-review" ? row.status === "in-review" : filter === row.status);
    return matchesQuery && matchesFilter;
  }), [filter, query, rows]);

  if (loadState === "initial-loading") {
    return (
      <section className={styles.loadingState} aria-label="Órdenes activas" role="status">
        <p>Cargando órdenes…</p>
      </section>
    );
  }

  if (loadState === "error" && rows.length === 0) {
    return (
      <section className={styles.loadingState} aria-label="Órdenes activas" role="alert">
        <p className={styles.error}>Error cargando órdenes: {loadError ?? "No se pudieron cargar las órdenes."}</p>
      </section>
    );
  }

  if (rows.length === 0 && loadState === "empty") {
    return (
      <div>
        <p className={styles.empty}>No hay órdenes abiertas.</p>
      </div>
    );
  }

  const selectFromSheet = (tableId: string): void => {
    onSelectTable(tableId);
    setSheetOpen(false);
    requestAnimationFrame(() => {
      const card = Array.from(document.querySelectorAll<HTMLElement>("[data-table-id]"))
        .find((element) => element.dataset.tableId === tableId);
      card?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    });
  };

  return (
    <section className={styles.ordersSection} aria-label="Órdenes activas">
      <header className={styles.ordersHeader}>
        <h2>Órdenes activas</h2>
        <button type="button" className={styles.allButton} onClick={() => setSheetOpen(true)}>Ver todas ({rows.length}) <span aria-hidden="true">›</span></button>
      </header>
      {loadState === "refreshing" ? <p className={styles.refreshing} role="status">Actualizando órdenes…</p> : null}
      {loadState === "error" && loadError ? <p className={styles.error} role="alert">No se pudo actualizar la lista: {loadError}</p> : null}
      <div className={styles.carousel}>
        {newOrder ? <div className={styles.newOrderSlot}>{newOrder}</div> : null}
        <div className={styles.list} aria-label="Mesas activas">
        {rows.map((row) => (
          <div key={row.tableId} className={styles.row} data-table-id={row.tableId} data-selected={row.tableId === selectedTableId}>
            <button type="button" className={styles.rowMain} aria-pressed={row.tableId === selectedTableId} onClick={() => onSelectTable(row.tableId)}>
              <span className={styles.identity}><strong>{row.tableLabel}</strong><span className={styles.meta}>{row.itemCount} productos</span></span>
              {row.tableId === selectedTableId ? <StatusPill status={row.status} /> : null}
              <span className={styles.balance}><small>Pendiente</small><PriceTag cents={row.totalCents} /></span>
            </button>
            {row.itemCount === 0 ? <button type="button" className={styles.removeButton} aria-label={`Eliminar orden vacía de ${row.tableLabel}`} onClick={() => onRemoveEmptyOrder(row.tableId)}>×</button> : null}
          </div>
        ))}
        </div>
      </div>

      {sheetOpen ? (
        <div className={styles.sheetBackdrop} role="presentation" onMouseDown={() => setSheetOpen(false)}>
          <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="all-orders-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.sheetHeader}><h2 id="all-orders-title">Mesas y órdenes</h2><button type="button" className={styles.closeButton} aria-label="Cerrar" onClick={() => setSheetOpen(false)}>×</button></div>
            <input className={styles.search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar mesa u orden" aria-label="Buscar mesa u orden" />
            <div className={styles.filters} role="tablist" aria-label="Filtros de órdenes">
              {([["all", "Todas"], ["active", "Activas"], ["in-review", "En revisión"], ["paid", "Pagadas"]] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)}>{label}</button>)}
            </div>
            <div className={styles.sheetList}>
              {filteredRows.map((row) => <button key={row.tableId} type="button" className={styles.sheetRow} data-selected={row.tableId === selectedTableId} onClick={() => selectFromSheet(row.tableId)}><span><strong>{row.tableLabel}</strong><small>{row.itemCount} productos · <PriceTag cents={row.totalCents} /></small></span><StatusPill status={row.status} />{row.tableId === selectedTableId ? <span className={styles.selectedMark} aria-label="Seleccionada">✓</span> : null}</button>)}
              {filteredRows.length === 0 ? <p className={styles.empty}>No se encontraron órdenes.</p> : null}
            </div>
            <button type="button" className={styles.newOrderAction} onClick={() => { setSheetOpen(false); onNewOrder?.(); }}>+ Nueva orden</button>
          </section>
        </div>
      ) : null}
    </section>
  );
}
