import { useState, type FormEvent } from "react";
import type { Category } from "@kutana/shared/catalog/model/category.js";
import { Button } from "../../../design-system/atoms/Button.js";
import { Icon } from "../../../design-system/atoms/Icon.js";
import { Input } from "../../../design-system/atoms/Input.js";
import styles from "./CategoryManagement.module.css";

export interface CategoryManagementProps {
  readonly categories: readonly Category[];
  readonly onCreate: (values: { name: string; sortOrder: number }) => void;
  readonly onSave: (category: Category) => void;
  readonly onDelete: (categoryId: string) => void;
  readonly disabled?: boolean;
  readonly message?: string | null;
}

export function CategoryManagement({
  categories,
  onCreate,
  onSave,
  onDelete,
  disabled = false,
  message = null,
}: CategoryManagementProps): JSX.Element {
  const [newName, setNewName] = useState("");
  const [newSortOrder, setNewSortOrder] = useState("0");
  const sorted = [...categories].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
  );

  function create(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    onCreate({ name, sortOrder: Number.parseInt(newSortOrder, 10) || 0 });
    setNewName("");
    setNewSortOrder("0");
  }

  return (
    <section className={styles.screen} aria-labelledby="category-management-heading">
      <header className={styles.header}>
        <p className={styles.eyebrow}>Catálogo</p>
        <h2 id="category-management-heading">Categorías</h2>
        <p>Crea y ordena las categorías que agrupan el menú de KUTANA.</p>
      </header>

      <form className={styles.card} role="form" aria-label="Crear categoría" onSubmit={create}>
        <Input label="Nombre" name="category-name" value={newName} onChange={setNewName} />
        <Input
          label="Orden"
          name="category-sort-order"
          type="number"
          value={newSortOrder}
          onChange={setNewSortOrder}
        />
        <Button type="submit" disabled={disabled || newName.trim() === ""} onClick={() => {}}>
          Crear categoría
        </Button>
      </form>

      {message ? <p className={styles.message}>{message}</p> : null}

      <ul className={styles.list} aria-label="Categorías existentes">
        {sorted.map((category) => (
          <EditableCategoryRow
            key={category.id}
            category={category}
            onSave={onSave}
            onDelete={onDelete}
            disabled={disabled}
          />
        ))}
      </ul>
    </section>
  );
}

function EditableCategoryRow({
  category,
  onSave,
  onDelete,
  disabled,
}: {
  readonly category: Category;
  readonly onSave: (category: Category) => void;
  readonly onDelete: (categoryId: string) => void;
  readonly disabled: boolean;
}): JSX.Element {
  const [name, setName] = useState(category.name);
  const [sortOrder, setSortOrder] = useState(String(category.sortOrder));

  function save(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({ ...category, name: trimmed, sortOrder: Number.parseInt(sortOrder, 10) || 0 });
  }

  return (
    <li className={styles.row}>
      <form role="form" aria-label={`Editar ${category.name}`} onSubmit={save}>
        <Input
          label="Nombre"
          name={`category-name-${category.id}`}
          value={name}
          onChange={setName}
        />
        <Input
          label="Orden"
          name={`category-sort-order-${category.id}`}
          type="number"
          value={sortOrder}
          onChange={setSortOrder}
        />
        <div className={styles.actions}>
          <Button
            type="submit"
            variant="secondary"
            disabled={disabled || name.trim() === ""}
            onClick={() => {}}
          >
            Guardar
          </Button>
          <button
            type="button"
            className={styles.iconButton}
            aria-label={`Eliminar categoría ${category.name}`}
            title="Eliminar categoría"
            disabled={disabled}
            onClick={() => onDelete(category.id)}
          >
            <Icon name="trash" size={18} />
          </button>
        </div>
      </form>
    </li>
  );
}
