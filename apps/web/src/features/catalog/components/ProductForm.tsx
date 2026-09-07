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

const POUR_SIZES: PourSize[] = [330, 500, 750, 1000];

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
  const activeFieldId = useId();
  const errorCount = Object.keys(errors).length;

  function update<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]): void {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <form
      aria-label="Formulario de producto"
      role="form"
      className={styles.form}
      onSubmit={handleSubmit}
    >
      <header className={styles.header}>
        <p className={styles.eyebrow}>Configuración del catálogo</p>
        <div>
          <h2>{submitLabel === "Crear producto" ? "Agregar producto" : "Editar producto"}</h2>
          <p>Primero cargá los datos de venta y después definí cómo impacta en el stock.</p>
        </div>
      </header>

      {errorCount > 0 ? (
        <div className={styles.errorSummary} role="alert" aria-live="polite">
          Revisá {errorCount === 1 ? "1 campo" : `${errorCount} campos`} e intentá de nuevo.
        </div>
      ) : null}

      <section className={styles.card} aria-labelledby="product-identity-heading">
        <div className={styles.sectionHeader}>
          <p className={styles.step}>Paso 1</p>
          <div>
            <h3 id="product-identity-heading">Identidad del producto</h3>
            <p>Nombre, categoría y códigos que usa la caja.</p>
          </div>
        </div>

        <Input
          label="Nombre"
          name="product-name"
          autoComplete="off"
          value={values.name}
          onChange={(value) => update("name", value)}
          placeholder="Lager de la casa…"
        />

        <div className={styles.selectField}>
          <label className={styles.label} htmlFor={categoryFieldId}>
            Categoría
          </label>
          <select
            id={categoryFieldId}
            name="product-category"
            autoComplete="off"
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
            name="product-sku"
            autoComplete="off"
            value={values.sku}
            onChange={(value) => update("sku", value)}
            error={errors.sku}
            placeholder="DRAFT-LAGER-500…"
          />
          <Input
            label="Código de barras"
            name="product-barcode"
            autoComplete="off"
            inputMode="numeric"
            value={values.barcode}
            onChange={(value) => update("barcode", value)}
            placeholder="7501234567890…"
          />
        </div>
      </section>

      <section className={styles.card} aria-labelledby="product-pricing-heading">
        <div className={styles.sectionHeader}>
          <p className={styles.step}>Paso 2</p>
          <div>
            <h3 id="product-pricing-heading">Precios y notas</h3>
            <p>El precio de venta es obligatorio; el costo y las notas son opcionales.</p>
          </div>
        </div>

        <div className={styles.row}>
          <Input
            label="Precio de venta (USD)"
            name="product-retail-price"
            autoComplete="off"
            inputMode="decimal"
            value={formatCentsToDollarsInput(values.retailPriceCents)}
            onChange={(value) => update("retailPriceCents", parseDollarsToCents(value))}
            placeholder="6.50…"
          />
          <Input
            label="Costo (USD)"
            name="product-cost-price"
            autoComplete="off"
            inputMode="decimal"
            value={
              values.costPriceCents === null ? "" : formatCentsToDollarsInput(values.costPriceCents)
            }
            onChange={(value) =>
              update("costPriceCents", value === "" ? null : parseDollarsToCents(value))
            }
            placeholder="4.25…"
          />
        </div>

        <Input
          label="Descripción"
          name="product-description"
          autoComplete="off"
          value={values.description}
          onChange={(value) => update("description", value)}
          multiline
          placeholder="Detalles opcionales…"
        />
      </section>

      <section className={styles.card} aria-labelledby="product-stock-heading">
        <div className={styles.sectionHeader}>
          <p className={styles.step}>Paso 3</p>
          <div>
            <h3 id="product-stock-heading">Comportamiento de stock</h3>
            <p>Usá stock por unidad para botellas o comida, y por volumen para cerveza tirada.</p>
          </div>
        </div>

        <div className={styles.selectField}>
          <label className={styles.label} htmlFor={stockKindFieldId}>
            Tipo de stock
          </label>
          <select
            id={stockKindFieldId}
            name="product-stock-kind"
            autoComplete="off"
            className={styles.select}
            value={values.stockKind}
            onChange={(event) => update("stockKind", event.target.value as StockKind)}
          >
            <option value="unit">Unidad (botellas, comida)</option>
            <option value="volume">Volumen (cerveza tirada, ml)</option>
          </select>
        </div>

        {values.stockKind === "volume" ? (
          <div className={styles.selectField}>
            <label className={styles.label} htmlFor={pourSizeFieldId}>
              Medida del vaso (ml)
            </label>
            <select
              id={pourSizeFieldId}
              name="product-pour-size"
              autoComplete="off"
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

        <div className={styles.row}>
          <Input
            label="Cantidad inicial de stock"
            name="product-initial-stock"
            autoComplete="off"
            inputMode="numeric"
            type="number"
            value={String(values.initialStockQuantity)}
            onChange={(value) => update("initialStockQuantity", Number(value) || 0)}
            placeholder="20…"
          />
          <Input
            label="Alerta de stock bajo"
            name="product-low-stock-level"
            autoComplete="off"
            inputMode="numeric"
            type="number"
            value={values.lowStockLevel === null ? "" : String(values.lowStockLevel)}
            onChange={(value) => update("lowStockLevel", value === "" ? null : Number(value) || 0)}
            placeholder="5…"
          />
        </div>

        <label className={styles.checkboxField} htmlFor={activeFieldId}>
          <input
            id={activeFieldId}
            name="product-active"
            type="checkbox"
            aria-label="Activo"
            checked={values.active}
            onChange={(event) => update("active", event.target.checked)}
          />
          <span>
            <strong>Activo</strong>
            <small>Mostrar este producto en los flujos de pedido.</small>
          </span>
        </label>
      </section>

      <div className={styles.actions}>
        <Button type="submit" onClick={() => {}}>
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
