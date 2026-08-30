import { useId, useState, type FormEvent } from "react";
import type { StockKind, PourSize } from "@kutana/shared/catalog/model/product.js";
import { Button } from "../../../design-system/atoms/Button.js";
import { Input } from "../../../design-system/atoms/Input.js";
import styles from "./ProductForm.module.css";

export interface ProductFormValues {
  readonly name: string;
  readonly categoryId: string;
  readonly sku: string;
  readonly barcode: string;
  readonly stockKind: StockKind;
  readonly pourSizeMl: PourSize | null;
  readonly description: string;
  /** Integer cents — the form parses the user's dollars-and-cents input to this integer before submit. */
  readonly retailPriceCents: number;
  /** Integer cents; null when the cost is unknown (never coerced to 0). */
  readonly costPriceCents: number | null;
  readonly lowStockLevel: number | null;
  readonly initialStockQuantity: number;
  readonly active: boolean;
}

export interface ProductFormCategoryOption {
  readonly id: string;
  readonly name: string;
}

export interface ProductFormProps {
  readonly categories: readonly ProductFormCategoryOption[];
  readonly initialValues: ProductFormValues;
  readonly onSubmit: (values: ProductFormValues) => void;
  readonly onCancel: () => void;
  readonly submitLabel: string;
  readonly errors?: Partial<Record<keyof ProductFormValues, string>>;
}

const POUR_SIZES: PourSize[] = [500, 750, 1000];

/**
 * Parses a "6.50"-style dollar string into integer cents using only integer
 * arithmetic (never `parseFloat(x) * 100`, which reintroduces float error —
 * see @kutana/shared Money / design-system's formatCents for the same rule
 * applied to the read side).
 */
function parseDollarsToCents(input: string): number {
  const [dollarsPart = "0", centsPart = "0"] = input.split(".");
  const dollars = Number.parseInt(dollarsPart, 10) || 0;
  const cents = Number.parseInt(centsPart.padEnd(2, "0").slice(0, 2), 10) || 0;
  return dollars * 100 + cents;
}

function formatCentsToDollarsInput(cents: number): string {
  const dollars = Math.trunc(cents / 100);
  const remainder = Math.abs(cents % 100);
  return `${dollars}.${remainder < 10 ? "0" : ""}${remainder}`;
}

/**
 * Purely presentational: props in, markup out, no port access. Owns only
 * local, uncommitted edit state for the controlled fields; the container
 * (`ProductFormContainer`) decides what to do with a submitted
 * `ProductFormValues` (create vs. save via `ProductRepository`).
 *
 * NOTE — deviation from the task prompt: no image-upload port exists yet,
 * so this form does not render an image field.
 */
export function ProductForm({
  categories,
  initialValues,
  onSubmit,
  onCancel,
  submitLabel,
  errors = {},
}: ProductFormProps): JSX.Element {
  const [values, setValues] = useState<ProductFormValues>(initialValues);
  const stockKindFieldId = useId();
  const categoryFieldId = useId();
  const pourSizeFieldId = useId();

  function update<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]): void {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <form aria-label="Product form" role="form" className={styles.form} onSubmit={handleSubmit}>
      <Input label="Name" value={values.name} onChange={(value) => update("name", value)} />

      <div className={styles.selectField}>
        <label className={styles.label} htmlFor={categoryFieldId}>
          Category
        </label>
        <select
          id={categoryFieldId}
          className={styles.select}
          value={values.categoryId}
          onChange={(event) => update("categoryId", event.target.value)}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.row}>
        <Input
          label="SKU"
          value={values.sku}
          onChange={(value) => update("sku", value)}
          error={errors.sku}
        />
        <Input
          label="Barcode"
          value={values.barcode}
          onChange={(value) => update("barcode", value)}
        />
      </div>

      <div className={styles.selectField}>
        <label className={styles.label} htmlFor={stockKindFieldId}>
          Stock kind
        </label>
        <select
          id={stockKindFieldId}
          className={styles.select}
          value={values.stockKind}
          onChange={(event) => update("stockKind", event.target.value as StockKind)}
        >
          <option value="unit">Unit (bottles, food)</option>
          <option value="volume">Volume (draft beer, ml)</option>
        </select>
      </div>

      {values.stockKind === "volume" ? (
        <div className={styles.selectField}>
          <label className={styles.label} htmlFor={pourSizeFieldId}>
            Pour size (ml)
          </label>
          <select
            id={pourSizeFieldId}
            className={styles.select}
            value={values.pourSizeMl ?? ""}
            onChange={(event) => update("pourSizeMl", Number(event.target.value) as PourSize)}
          >
            {POUR_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}ml
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <Input
        label="Description"
        value={values.description}
        onChange={(value) => update("description", value)}
        multiline
        placeholder="Optional details..."
      />

      <div className={styles.row}>
        <Input
          label="Retail price (USD)"
          value={formatCentsToDollarsInput(values.retailPriceCents)}
          onChange={(value) => update("retailPriceCents", parseDollarsToCents(value))}
        />
        <Input
          label="Cost price (USD)"
          value={
            values.costPriceCents === null ? "" : formatCentsToDollarsInput(values.costPriceCents)
          }
          onChange={(value) =>
            update("costPriceCents", value === "" ? null : parseDollarsToCents(value))
          }
        />
      </div>

      <div className={styles.row}>
        <Input
          label="Initial stock quantity"
          type="number"
          value={String(values.initialStockQuantity)}
          onChange={(value) => update("initialStockQuantity", Number(value) || 0)}
        />
        <Input
          label="Low-stock alert level"
          type="number"
          value={values.lowStockLevel === null ? "" : String(values.lowStockLevel)}
          onChange={(value) => update("lowStockLevel", value === "" ? null : Number(value) || 0)}
        />
      </div>

      <label className={styles.checkboxField}>
        <input
          type="checkbox"
          checked={values.active}
          onChange={(event) => update("active", event.target.checked)}
        />
        Active
      </label>

      <div className={styles.actions}>
        <Button type="submit" onClick={() => {}}>
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
