import { useCallback, useEffect, useState } from "react";
import { createCategory, type Category } from "@kutana/shared/catalog/model/category.js";
import { useCategories, useProducts } from "../../../composition/PortsProvider.js";
import { CategoryManagement } from "../components/CategoryManagement.js";
import styles from "./CategoryManagementContainer.module.css";

export function CategoryManagementContainer(): JSX.Element {
  const categoriesPort = useCategories();
  const productsPort = useProducts();
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(false);
    try {
      const list = await categoriesPort.listAll();
      const ordered = [...list].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      );
      const counts = await Promise.all(
        ordered.map(
          async (category) =>
            [
              category.id,
              (await productsPort.listByCategory(category.id, { includeInactive: true })).length,
            ] as const,
        ),
      );
      setCategories(ordered);
      setProductCounts(Object.fromEntries(counts));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [categoriesPort, productsPort]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(values: { name: string; sortOrder: number }): Promise<void> {
    setBusy(true);
    try {
      await categoriesPort.save(createCategory(values));
      setMessage("Categoría creada.");
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function save(category: Category): Promise<void> {
    setBusy(true);
    try {
      await categoriesPort.save(category);
      setMessage("Categoría actualizada.");
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function deleteCategory(categoryId: string): Promise<void> {
    setBusy(true);
    try {
      await categoriesPort.delete(categoryId);
      setMessage("Categoría eliminada.");
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function reorder(next: readonly Category[]): Promise<void> {
    const previous = categories;
    setCategories([...next]);
    setBusy(true);
    try {
      await Promise.all(next.map((category) => categoriesPort.save(category)));
      setMessage("Orden actualizado.");
      await load();
    } catch (reason) {
      setCategories(previous);
      setMessage(reason instanceof Error ? reason.message : "No se pudo actualizar el orden.");
      throw reason;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.screen}>
      <CategoryManagement
        categories={categories}
        productCounts={productCounts}
        onCreate={create}
        onSave={save}
        onDelete={deleteCategory}
        onReorder={reorder}
        loading={loading}
        error={error}
        onRetry={() => void load()}
        disabled={busy}
        message={message}
      />
    </div>
  );
}
