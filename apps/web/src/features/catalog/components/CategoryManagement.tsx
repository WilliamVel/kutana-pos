import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from "react";
import type { Category } from "@kutana/shared/catalog/model/category.js";
import { Button } from "../../../design-system/atoms/Button.js";
import { Icon } from "../../../design-system/atoms/Icon.js";
import styles from "./CategoryManagement.module.css";

const MAX_NAME_LENGTH = 80;
const normalizeName = (name: string): string => name.trim().replace(/\s+/g, " ");

export interface CategoryManagementProps {
  readonly categories: readonly Category[];
  readonly productCounts?: Readonly<Record<string, number>>;
  readonly onCreate: (values: { name: string; sortOrder: number }) => Promise<void>;
  readonly onSave: (category: Category) => Promise<void>;
  readonly onDelete: (categoryId: string) => Promise<void>;
  readonly onReorder?: (categories: readonly Category[]) => Promise<void>;
  readonly loading?: boolean;
  readonly error?: boolean;
  readonly onRetry?: () => void;
  readonly disabled?: boolean;
  readonly message?: string | null;
}

export function CategoryManagement({
  categories,
  productCounts = {},
  onCreate,
  onSave,
  onDelete,
  onReorder,
  loading = false,
  error = false,
  onRetry,
  disabled = false,
  message = null,
}: CategoryManagementProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; category?: Category } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [notice, setNotice] = useState(message ?? "");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const liveId = useId();
  const sorted = [...categories].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
  const filtered = query.trim()
    ? sorted.filter((category) =>
        category.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
      )
    : sorted;
  const showSearch = sorted.length > 8;

  useEffect(() => {
    if (message) setNotice(message);
  }, [message]);

  const move = (categoryId: string, direction: -1 | 1): void => {
    if (query || disabled) return;
    const index = sorted.findIndex((category) => category.id === categoryId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= sorted.length) return;
    const next = [...sorted];
    const current = next[index];
    const replacement = next[target];
    if (!current || !replacement) return;
    next[index] = replacement;
    next[target] = current;
    void onReorder?.(next.map((category, position) => ({ ...category, sortOrder: position + 1 })));
  };

  const reorderByDrop = (event: DragEvent<HTMLLIElement>, targetId: string): void => {
    event.preventDefault();
    if (!draggedId || draggedId === targetId || query || disabled) return;
    const from = sorted.findIndex((category) => category.id === draggedId);
    const to = sorted.findIndex((category) => category.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...sorted];
    const [item] = next.splice(from, 1);
    if (item) next.splice(to, 0, item);
    setDraggedId(null);
    setDragOverId(null);
    void onReorder?.(next.map((category, position) => ({ ...category, sortOrder: position + 1 })));
  };

  return (
    <section className={styles.screen} aria-labelledby="category-management-heading">
      <header className={styles.header}>
        <div className={styles.headingCopy}>
          <p className={styles.eyebrow}>Catálogo</p>
          <h2 id="category-management-heading">Categorías</h2>
          <p>Organiza las categorías que agrupan los productos del menú.</p>
          <span className={styles.count}>
            {sorted.length} {sorted.length === 1 ? "categoría" : "categorías"}
          </span>
        </div>
        <Button onClick={() => setModal({ mode: "create" })} disabled={disabled}>
          <Icon name="plus" size={18} /> Nueva categoría
        </Button>
      </header>

      {showSearch ? (
        <div className={styles.searchRow} role="search">
          <label className={styles.srOnly} htmlFor={`${liveId}-search`}>
            Buscar categorías
          </label>
          <Icon name="search" size={18} />
          <input
            id={`${liveId}-search`}
            type="search"
            placeholder="Buscar categorías"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button
              type="button"
              className={styles.clearButton}
              aria-label="Limpiar búsqueda"
              onClick={() => setQuery("")}
            >
              <Icon name="close" size={16} />
            </button>
          ) : null}
        </div>
      ) : null}

      <div id={liveId} className={styles.live} aria-live="polite" aria-atomic="true">
        {notice}
      </div>
      {loading ? (
        <div className={styles.loading} aria-label="Cargando categorías">
          {[1, 2, 3].map((item) => (
            <div className={styles.skeleton} key={item} />
          ))}
        </div>
      ) : error ? (
        <div className={styles.empty}>
          <h3>No pudimos cargar las categorías</h3>
          <p>Revisa tu conexión e inténtalo de nuevo.</p>
          {onRetry ? (
            <Button variant="secondary" onClick={onRetry}>
              Intentar de nuevo
            </Button>
          ) : null}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState onCreate={() => setModal({ mode: "create" })} />
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <h3>No encontramos categorías con ese nombre.</h3>
          <Button variant="secondary" onClick={() => setQuery("")}>
            Limpiar búsqueda
          </Button>
        </div>
      ) : (
        <>
          {query ? (
            <p className={styles.orderHint}>Limpia la búsqueda para cambiar el orden.</p>
          ) : null}
          <ul className={styles.list} aria-label="Categorías existentes">
            {filtered.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                index={sorted.indexOf(category)}
                total={sorted.length}
                productCount={productCounts[category.id] ?? 0}
                disabled={disabled}
                canReorder={!query}
                isDragOver={dragOverId === category.id}
                onEdit={() => setModal({ mode: "edit", category })}
                onDelete={() => setDeleteTarget(category)}
                onMove={(direction) => move(category.id, direction)}
                onDragStart={(event) => {
                  setDraggedId(category.id);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", category.id);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!query) setDragOverId(category.id);
                }}
                onDrop={(event) => reorderByDrop(event, category.id)}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDragOverId(null);
                }}
              />
            ))}
          </ul>
        </>
      )}

      {modal ? (
        <CategoryModal
          mode={modal.mode}
          category={modal.category}
          categories={sorted}
          disabled={disabled}
          onClose={() => setModal(null)}
          onCreate={onCreate}
          onSave={onSave}
        />
      ) : null}
      {deleteTarget ? (
        <DeleteDialog
          productCount={productCounts[deleteTarget.id] ?? 0}
          disabled={disabled}
          onClose={() => setDeleteTarget(null)}
          onDelete={async () => {
            await onDelete(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      ) : null}
    </section>
  );
}

function EmptyState({ onCreate }: { readonly onCreate: () => void }): JSX.Element {
  return (
    <div className={styles.empty}>
      <h3>Todavía no hay categorías</h3>
      <p>Crea una categoría para comenzar a organizar tus productos.</p>
      <Button onClick={onCreate}>Crear primera categoría</Button>
    </div>
  );
}

function CategoryRow({
  category,
  index,
  total,
  productCount,
  disabled,
  canReorder,
  isDragOver,
  onEdit,
  onDelete,
  onMove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  readonly category: Category;
  readonly index: number;
  readonly total: number;
  readonly productCount: number;
  readonly disabled: boolean;
  readonly canReorder: boolean;
  readonly isDragOver: boolean;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly onMove: (direction: -1 | 1) => void;
  readonly onDragStart: (event: DragEvent<HTMLLIElement>) => void;
  readonly onDragOver: (event: DragEvent<HTMLLIElement>) => void;
  readonly onDrop: (event: DragEvent<HTMLLIElement>) => void;
  readonly onDragEnd: () => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <li
      className={`${styles.row} ${isDragOver ? styles.dragOver : ""}`}
      draggable={canReorder && !disabled}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <button
        type="button"
        className={styles.dragHandle}
        disabled={!canReorder || disabled}
        aria-label={`Reordenar ${category.name}. Usa mover arriba o abajo desde acciones.`}
        title="Arrastrar para reordenar"
      >
        <Icon name="drag" size={18} />
      </button>
      <span className={styles.position} aria-label={`Posición ${index + 1}`}>
        {index + 1}
      </span>
      <div className={styles.categoryName}>
        <strong>{category.name}</strong>
        <span>
          {productCount} {productCount === 1 ? "producto" : "productos"}
        </span>
      </div>
      <div className={styles.rowActions}>
        <button type="button" className={styles.actionButton} onClick={onEdit} disabled={disabled}>
          <Icon name="edit" size={17} /> <span className={styles.actionLabel}>Editar</span>
        </button>
        <div className={styles.menuWrap}>
          <button
            type="button"
            className={styles.iconButton}
            aria-label={`Acciones para ${category.name}`}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <Icon name="more" size={20} />
          </button>
          {open ? (
            <div className={styles.menu} role="menu" aria-label={`Acciones para ${category.name}`}>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
              >
                Editar
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={index === 0 || disabled || !canReorder}
                onClick={() => {
                  setOpen(false);
                  onMove(-1);
                }}
              >
                Mover arriba
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={index === total - 1 || disabled || !canReorder}
                onClick={() => {
                  setOpen(false);
                  onMove(1);
                }}
              >
                Mover abajo
              </button>
              <button
                type="button"
                role="menuitem"
                className={styles.destructive}
                disabled={disabled}
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
              >
                Eliminar
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function CategoryModal({
  mode,
  category,
  categories,
  disabled,
  onClose,
  onCreate,
  onSave,
}: {
  readonly mode: "create" | "edit";
  readonly category?: Category;
  readonly categories: readonly Category[];
  readonly disabled: boolean;
  readonly onClose: () => void;
  readonly onCreate: CategoryManagementProps["onCreate"];
  readonly onSave: CategoryManagementProps["onSave"];
}): JSX.Element {
  const [name, setName] = useState(category?.name ?? "");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const initialFocus = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    initialFocus.current?.focus();
  }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, saving]);
  const normalized = normalizeName(name);
  const duplicate = categories.some(
    (item) =>
      item.id !== category?.id &&
      normalizeName(item.name).toLocaleLowerCase() === normalized.toLocaleLowerCase(),
  );
  const validation = !normalized
    ? "Escribe un nombre."
    : normalized.length > MAX_NAME_LENGTH
      ? `El nombre no puede superar los ${MAX_NAME_LENGTH} caracteres.`
      : duplicate
        ? "Ya existe una categoría con este nombre."
        : "";
  const unchanged = mode === "edit" && normalized === normalizeName(category?.name ?? "");
  const displayedError = error || (touched ? validation : "");
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (validation || saving || disabled) {
      setError(validation);
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (mode === "create") await onCreate({ name: normalized, sortOrder: categories.length + 1 });
      else if (category) await onSave({ ...category, name: normalized });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar la categoría.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div
      className={styles.modalBackdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
      >
        <h3 id="category-modal-title">
          {mode === "create" ? "Nueva categoría" : "Editar categoría"}
        </h3>
        <p>Este nombre aparecerá en el menú y en el POS.</p>
        <form onSubmit={(event) => void submit(event)}>
          <label htmlFor="category-modal-name">Nombre de la categoría</label>
          <input
            ref={initialFocus}
            id="category-modal-name"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            onChange={(event) => {
              setName(event.target.value);
              setTouched(true);
              setError("");
            }}
            aria-invalid={Boolean(displayedError)}
            aria-describedby={displayedError ? "category-modal-error" : undefined}
            autoComplete="off"
          />
          {displayedError ? (
            <span id="category-modal-error" className={styles.error} role="alert">
              {displayedError}
            </span>
          ) : null}
          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={() => {}}
              disabled={Boolean(validation) || unchanged || saving || disabled}
              ariaBusy={saving}
            >
              {saving ? "Guardando…" : mode === "create" ? "Crear categoría" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteDialog({
  productCount,
  disabled,
  onClose,
  onDelete,
}: {
  readonly productCount: number;
  readonly disabled: boolean;
  readonly onClose: () => void;
  readonly onDelete: () => Promise<void>;
}): JSX.Element {
  const [deleting, setDeleting] = useState(false);
  const hasProducts = productCount > 0;
  const submit = async (): Promise<void> => {
    if (hasProducts || deleting || disabled) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };
  return (
    <div className={styles.modalBackdrop}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-category-title"
      >
        <h3 id="delete-category-title">
          {hasProducts ? "Esta categoría contiene productos" : "¿Eliminar esta categoría?"}
        </h3>
        <p>
          {hasProducts
            ? `Hay ${productCount} ${productCount === 1 ? "producto asociado" : "productos asociados"} a esta categoría. Reasígnalos antes de eliminarla.`
            : "Esta acción no se puede deshacer."}
        </p>
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={onClose} disabled={deleting}>
            Cancelar
          </Button>
          {hasProducts ? null : (
            <button
              type="button"
              className={styles.deleteButton}
              onClick={() => void submit()}
              disabled={deleting || disabled}
            >
              {deleting ? "Eliminando…" : "Eliminar categoría"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
