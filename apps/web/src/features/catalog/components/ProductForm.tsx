import { useEffect, useId, useRef, useState, type FormEvent } from "react";
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
  readonly retailPriceCents: number;
  readonly costPriceCents: number | null;
  readonly lowStockLevel: number | null;
  readonly initialStockQuantity: number;
  readonly active: boolean;
  /** UI-only until the catalog model gains a persisted presentation field. */
  readonly presentation?: string;
  /** Maps to the existing pourSizeMl field when the product uses volume. */
  readonly contentMl?: number | null;
  readonly trackInventory?: boolean;
  readonly stockUnit?: "ea" | "ml" | "l";
}

export interface ProductFormCategoryOption { readonly id: string; readonly name: string; }
export interface ProductFormProps {
  readonly categories: readonly ProductFormCategoryOption[];
  readonly initialValues: ProductFormValues;
  readonly onSubmit: (values: ProductFormValues) => void;
  readonly onCancel: () => void;
  readonly submitLabel: string;
  readonly errors?: Partial<Record<keyof ProductFormValues, string>>;
}

const POUR_SIZES: PourSize[] = [330, 500, 750, 1000];
const PRESENTATIONS = ["Botella", "Lata", "Vaso", "Jarra", "Plato", "Unidad"];

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
function suggestedSku(name: string, presentation: string, contentMl: number | null): string {
  const base = `${name}-${presentation}-${contentMl ?? ""}`
    .toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  return base || "PRODUCTO";
}

export function ProductForm({ categories, initialValues, onSubmit, onCancel, submitLabel, errors = {} }: ProductFormProps): JSX.Element {
  const initial = {
    ...initialValues,
    presentation: initialValues.presentation ?? (initialValues.stockKind === "volume" ? "Vaso" : "Unidad"),
    contentMl: initialValues.contentMl ?? initialValues.pourSizeMl,
    trackInventory: initialValues.trackInventory ?? false,
    stockUnit: initialValues.stockUnit ?? (initialValues.stockKind === "volume" ? "ml" : "ea"),
  };
  const [values, setValues] = useState<ProductFormValues>(initial);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const nameId = useId();
  const categoryId = useId();
  const stockKindId = useId();
  const stockUnitId = useId();
  const presentationId = useId();
  const contentId = useId();
  const activeId = useId();
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]): void {
    setValues((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }
  function touch(key: string): void { setTouched((current) => new Set(current).add(key)); }
  const localErrors: Partial<Record<keyof ProductFormValues, string>> = {
    name: !values.name.trim() ? "Ingresa el nombre del producto." : undefined,
    categoryId: !values.categoryId ? "Selecciona una categoría." : undefined,
    retailPriceCents: values.retailPriceCents < 0 ? "Ingresa un precio válido." : undefined,
    ...(values.trackInventory && values.stockKind === "volume" && !values.contentMl ? { contentMl: "Indicá el contenido en mililitros." } : {}),
    ...errors,
  };
  const visibleErrors = Object.fromEntries(Object.entries(localErrors).filter(([key, value]) => value && (errors[key as keyof ProductFormValues] || submitted || touched.has(key)))) as Partial<Record<keyof ProductFormValues, string>>;

  useEffect(() => {
    if (submitted && Object.keys(visibleErrors).length > 0) summaryRef.current?.focus();
  }, [submitted]);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSubmitted(true);
    const invalid = Object.keys(localErrors).filter((key) => localErrors[key as keyof ProductFormValues]);
    if (invalid.length > 0) {
      setTouched(new Set(invalid));
      return;
    }
    const sku = values.sku.trim() || suggestedSku(values.name, values.presentation ?? "Unidad", values.contentMl ?? null);
    setIsSubmitting(true);
    onSubmit({ ...values, sku, pourSizeMl: values.stockKind === "volume" ? (values.contentMl as PourSize | null) : null });
  }

  const shownError = (key: keyof ProductFormValues): string | undefined => visibleErrors[key];
  const stockUnitLabel = values.stockKind === "volume" ? (values.stockUnit === "l" ? "L" : "ml") : "unidades";
  const displayQuantity = (quantity: number): string => values.stockKind === "volume" && values.stockUnit === "l" ? String(quantity / 1000) : String(quantity);
  const toStoredQuantity = (value: string): number => {
    const parsed = Number(value) || 0;
    return values.stockKind === "volume" && values.stockUnit === "l" ? parsed * 1000 : parsed;
  };

  return (
    <form aria-label="Formulario de producto" role="form" className={styles.form} onSubmit={handleSubmit}>
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>Catálogo</p><h2>{submitLabel === "Crear producto" ? "Agregar producto" : "Editar producto"}</h2></div>
        <p>Completa los datos principales. Los campos con * son obligatorios.</p>
      </header>

      {Object.keys(visibleErrors).length > 0 ? (
        <div ref={summaryRef} className={styles.errorSummary} role="alert" tabIndex={-1} aria-live="polite">
          <strong>Revisá los datos del producto.</strong>
          <ul>{Object.entries(visibleErrors).map(([key, message]) => <li key={key}>{message}</li>)}</ul>
        </div>
      ) : null}

      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          <section className={styles.card} aria-labelledby="product-basic-heading">
            <div className={styles.sectionHeader}><div><h3 id="product-basic-heading">Información básica</h3><p>Lo esencial para vender este producto.</p></div></div>
            <Input id={nameId} label="Nombre del producto *" name="product-name" autoComplete="off" required value={values.name} onBlur={() => touch("name")} onChange={(value) => update("name", value)} error={shownError("name")} placeholder="Ej. Lager de la casa" />
            <div className={styles.row}>
              <div className={styles.selectField}><label className={styles.label} htmlFor={categoryId}>Categoría *</label><select id={categoryId} required className={styles.select} value={values.categoryId} onBlur={() => touch("categoryId")} onChange={(event) => update("categoryId", event.target.value)} aria-invalid={Boolean(shownError("categoryId"))} aria-describedby={shownError("categoryId") ? `${categoryId}-error` : undefined}><option value="">Selecciona una categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{shownError("categoryId") ? <span id={`${categoryId}-error`} className={styles.error}>{shownError("categoryId")}</span> : null}</div>
              <div className={styles.selectField}><label className={styles.label} htmlFor={presentationId}>Presentación o formato</label><select id={presentationId} className={styles.select} value={values.presentation} onChange={(event) => update("presentation", event.target.value)}>{PRESENTATIONS.map((item) => <option key={item}>{item}</option>)}</select></div>
            </div>
            <div className={styles.row}>
              <div className={styles.selectField}><label className={styles.label} htmlFor={contentId}>Contenido o tamaño</label><select id={contentId} className={styles.select} value={values.contentMl ?? ""} onChange={(event) => update("contentMl", event.target.value ? Number(event.target.value) : null)}><option value="">Sin especificar</option>{POUR_SIZES.map((size) => <option key={size} value={size}>{size} ml</option>)}</select></div>
              <Input label="Precio de venta * (USD)" name="product-retail-price" inputMode="decimal" required value={formatCentsToDollarsInput(values.retailPriceCents)} onBlur={() => touch("retailPriceCents")} onChange={(value) => update("retailPriceCents", parseDollarsToCents(value))} error={shownError("retailPriceCents")} placeholder="6.50" />
            </div>
          </section>

          <section className={styles.card} aria-labelledby="product-stock-heading">
            <div className={styles.sectionHeader}><div><h3 id="product-stock-heading">Control de inventario</h3><p>Activá esta opción solo si necesitás descontar existencias.</p></div><label className={styles.switch}><input type="checkbox" checked={values.trackInventory} onChange={(event) => update("trackInventory", event.target.checked)} /><span>Controlar inventario para este producto</span></label></div>
            {values.trackInventory ? <div className={styles.stockFields}>
              <div className={styles.selectField}><label className={styles.label} htmlFor={stockKindId}>Tipo de control</label><select id={stockKindId} className={styles.select} value={values.stockKind} onChange={(event) => update("stockKind", event.target.value as StockKind)}><option value="unit">Por unidades</option><option value="volume">Por volumen</option></select></div>
              {values.stockKind === "volume" ? <div className={styles.selectField}><label className={styles.label} htmlFor={stockUnitId}>Unidad de medida</label><select id={stockUnitId} className={styles.select} value={values.stockUnit} onChange={(event) => update("stockUnit", event.target.value as "ml" | "l")}><option value="l">Litros (L)</option><option value="ml">Mililitros (ml)</option></select></div> : null}
              <div className={styles.row}><Input label={`Stock inicial (${stockUnitLabel})`} type="number" inputMode="decimal" min={0} value={displayQuantity(values.initialStockQuantity)} onChange={(value) => update("initialStockQuantity", toStoredQuantity(value))} /><Input label={`Alerta de stock bajo (${stockUnitLabel})`} type="number" inputMode="decimal" min={0} value={values.lowStockLevel === null ? "" : displayQuantity(values.lowStockLevel)} onChange={(value) => update("lowStockLevel", value === "" ? null : toStoredQuantity(value))} /></div>
            </div> : <p className={styles.muted}>Sin control de existencias. El producto estará disponible para la venta.</p>}
          </section>

          <details className={styles.moreOptions} open={moreOpen || Boolean(errors.sku || errors.barcode)} onToggle={(event) => setMoreOpen(event.currentTarget.open)}><summary><span>Más opciones</span><span className={styles.chevron} aria-hidden="true">⌄</span></summary><div className={styles.moreGrid}><Input label="Costo (USD)" inputMode="decimal" value={values.costPriceCents === null ? "" : formatCentsToDollarsInput(values.costPriceCents)} onChange={(value) => update("costPriceCents", value === "" ? null : parseDollarsToCents(value))} placeholder="Opcional" /><Input label="SKU" value={values.sku} onChange={(value) => update("sku", value)} placeholder="Se sugiere automáticamente" /><Input label="Código de barras" inputMode="numeric" value={values.barcode} onChange={(value) => update("barcode", value)} error={shownError("barcode")} /><Input label="Descripción" multiline value={values.description} onChange={(value) => update("description", value)} /></div></details>
          <div className={styles.actions}><Button type="button" variant="secondary" onClick={() => { if (!dirty || window.confirm("¿Descartar los cambios sin guardar?")) onCancel(); }}>Cancelar</Button><Button type="submit" disabled={isSubmitting} ariaBusy={isSubmitting} onClick={() => undefined}>{isSubmitting ? "Guardando…" : submitLabel}</Button></div>
        </div>

        <aside className={styles.summary} aria-label="Resumen del producto"><div className={styles.summaryHeader}><h3>Resumen</h3><label className={styles.statusRow} htmlFor={activeId}><span>Estado</span><span className={values.active ? styles.statusBadge : styles.statusBadgeDraft}>{values.active ? "Activo" : "Borrador"}</span><input id={activeId} type="checkbox" checked={values.active} onChange={(event) => update("active", event.target.checked)} aria-label="Producto activo" /></label></div><div className={styles.preview}><span>Producto</span><strong>{values.name || "Sin nombre"}</strong></div><div className={styles.priceBlock}><span>Precio de venta</span><strong>{values.retailPriceCents > 0 ? `${formatCentsToDollarsInput(values.retailPriceCents)} USD` : "Sin precio"}</strong></div><dl><div><dt>Categoría</dt><dd>{categories.find((category) => category.id === values.categoryId)?.name ?? "Sin seleccionar"}</dd></div><div><dt>Presentación</dt><dd>{values.presentation || "Sin especificar"}</dd></div><div><dt>Contenido</dt><dd>{values.contentMl ? `${values.contentMl} ml` : "Sin especificar"}</dd></div><div><dt>Inventario</dt><dd>{values.trackInventory ? `Controlado · ${values.stockKind === "volume" ? "volumen" : "unidades"}` : "No controlado"}</dd></div></dl></aside>
      </div>

    </form>
  );
}
