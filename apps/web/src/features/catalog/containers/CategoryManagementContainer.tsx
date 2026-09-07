import { useCallback, useEffect, useState } from "react";
import { createCategory, type Category } from "@kutana/shared/catalog/model/category.js";
import { useCategories } from "../../../composition/PortsProvider.js";
import { CategoryManagement } from "../components/CategoryManagement.js";
import styles from "./CategoryManagementContainer.module.css";

export function CategoryManagementContainer(): JSX.Element {
  const categoriesPort = useCategories();
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const list = await categoriesPort.listAll();
    setCategories(
      [...list].sort(
        (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
      ),
    );
  }, [categoriesPort]);

  useEffect(() => {
    void load();
  }, [load]);

  function create(values: { name: string; sortOrder: number }): void {
    void (async () => {
      setBusy(true);
      try {
        await categoriesPort.save(createCategory(values));
        setMessage("Categoría creada.");
        await load();
      } finally {
        setBusy(false);
      }
    })();
  }

  function save(category: Category): void {
    void (async () => {
      setBusy(true);
      try {
        await categoriesPort.save(category);
        setMessage("Categoría guardada.");
        await load();
      } finally {
        setBusy(false);
      }
    })();
  }

  return (
    <div className={styles.screen}>
      <CategoryManagement
        categories={categories}
        onCreate={create}
        onSave={save}
        disabled={busy}
        message={message}
      />
    </div>
  );
}
