import { FormEvent, useEffect, useMemo, useState } from "react";
import type { AnalyticsDateRange, AnalyticsPageQuery, AnalyticsSummary, DailySalesPage, ProductMixPage } from "@kutana/shared/analytics/model/analytics.js";
import { ANALYTICS_TIMEZONE } from "@kutana/shared/analytics/model/analytics.js";
import { useAnalytics } from "../../composition/PortsProvider.js";
import { Button } from "../../design-system/atoms/Button.js";
import { Input } from "../../design-system/atoms/Input.js";
import { Panel } from "../../design-system/molecules/Panel.js";
import styles from "./AnalyticsScreen.module.css";

const PAGE_SIZE = 10;
const empty: AnalyticsSummary = { timezone: ANALYTICS_TIMEZONE, currencyCode: "USD", from: null, to: null, grossSalesCents: 0, collectedCents: 0, orderCount: 0, averageOrderCents: null, trendGranularity: "day", dailySales: [], productMix: [], paymentMix: [], pendingExposure: [] };
const money = (cents: number | null, currencyCode: string): string => cents === null ? "—" : new Intl.NumberFormat("es", { style: "currency", currency: currencyCode }).format(cents / 100);
const isoDate = (date: Date): string => new Intl.DateTimeFormat("en-CA", { timeZone: ANALYTICS_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const shiftDays = (date: Date, days: number): string => { const shifted = new Date(date); shifted.setUTCDate(shifted.getUTCDate() + days); return isoDate(shifted); };
const todayRange = (days: number): AnalyticsDateRange => { const now = new Date(); return { from: shiftDays(now, -(days - 1)), to: isoDate(now) }; };
const validDate = (value: string): boolean => !value || /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const paymentLabel = (label: string, code: string): string => ({ cash: "Efectivo", CASH: "Efectivo", card: "Tarjeta", CARD: "Tarjeta", BANK_TRANSFER: "Transferencia bancaria", bank_transfer: "Transferencia bancaria", QR_PAYMENT: "Pago con QR", qr_payment: "Pago con QR" }[code] ?? { Cash: "Efectivo", Card: "Tarjeta", "Bank Transfer": "Transferencia bancaria", "QR Payment": "Pago con QR" }[label] ?? label);

type DetailView = "daily" | "products" | null;
type Preset = "today" | "7" | "30" | "custom" | "all";

export function AnalyticsScreen(): JSX.Element {
  const analytics = useAnalytics();
  const initialRange = useMemo(() => todayRange(30), []);
  const [draftFrom, setDraftFrom] = useState(initialRange.from ?? "");
  const [draftTo, setDraftTo] = useState(initialRange.to ?? "");
  const [range, setRange] = useState<AnalyticsDateRange>(initialRange);
  const [preset, setPreset] = useState<Preset>("30");
  const [data, setData] = useState<AnalyticsSummary>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailView>(null);
  const [dailyPage, setDailyPage] = useState<DailySalesPage | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyPageNumber, setDailyPageNumber] = useState(0);
  const [productPage, setProductPage] = useState<ProductMixPage | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const [productPageNumber, setProductPageNumber] = useState(0);
  const [productSearchDraft, setProductSearchDraft] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productSort, setProductSort] = useState<"revenue" | "quantity">("revenue");

  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setDetail(null); setDailyPage(null); setProductPage(null); setDailyPageNumber(0); setProductPageNumber(0);
    void analytics.summary(range).then((result) => { if (active) setData(result); }).catch(() => { if (active) setError("No se pudo cargar la analítica."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [analytics, range]);

  useEffect(() => {
    if (detail !== "daily") return;
    let active = true; setDailyLoading(true);
    void analytics.dailyDetail({ ...range, page: dailyPageNumber, pageSize: PAGE_SIZE }).then((result) => { if (active) setDailyPage(result); }).catch(() => { if (active) setError("No se pudo cargar el detalle diario."); }).finally(() => { if (active) setDailyLoading(false); });
    return () => { active = false; };
  }, [analytics, detail, dailyPageNumber, range]);

  useEffect(() => {
    if (detail !== "products") return;
    let active = true; setProductLoading(true);
    const query: AnalyticsPageQuery = { ...range, search: productSearch || undefined, sort: productSort, page: productPageNumber, pageSize: PAGE_SIZE };
    void analytics.productDetail(query).then((result) => { if (active) setProductPage(result); }).catch(() => { if (active) setError("No se pudo cargar el detalle de productos."); }).finally(() => { if (active) setProductLoading(false); });
    return () => { active = false; };
  }, [analytics, detail, productPageNumber, productSearch, productSort, range]);

  const applyCustom = (event: FormEvent): void => {
    event.preventDefault();
    if (!validDate(draftFrom) || !validDate(draftTo)) return setFilterError("Usá fechas válidas en formato AAAA-MM-DD.");
    if (draftFrom && draftTo && draftFrom > draftTo) return setFilterError("La fecha Desde debe ser anterior o igual a Hasta.");
    setFilterError(null); setPreset("custom"); setRange({ from: draftFrom || undefined, to: draftTo || undefined });
  };
  const applyPreset = (next: Preset): void => {
    setFilterError(null); setPreset(next); setProductPageNumber(0); setDailyPageNumber(0);
    const nextRange = next === "today" ? todayRange(1) : next === "7" ? todayRange(7) : next === "30" ? todayRange(30) : next === "all" ? {} : range;
    if (next !== "custom") { setDraftFrom(nextRange.from ?? ""); setDraftTo(nextRange.to ?? ""); setRange(nextRange); }
  };
  const period = data.from && data.to ? `${data.from} — ${data.to}` : "Todo el historial disponible";
  const hasData = data.orderCount > 0 || data.dailySales.some((row) => row.totalCents > 0);
  const trendRows = data.dailySales.length > 12 ? data.dailySales.filter((_, index, rows) => index === 0 || index === rows.length - 1 || index % Math.ceil(rows.length / 8) === 0) : data.dailySales;
  const trendMax = Math.max(...trendRows.map((row) => row.totalCents), 1);
  const showPresentation = data.productMix.some((row) => row.presentationSize);
  const maxProductPages = productPage ? Math.ceil(productPage.total / productPage.pageSize) : 0;
  const maxDailyPages = dailyPage ? Math.ceil(dailyPage.total / dailyPage.pageSize) : 0;

  return <div className={styles.screen}>
    <header><p className={styles.eyebrow}>Administración</p><h2>Analítica de ventas</h2><p>Ventas cerradas por fecha comercial. Incluye impuestos.</p></header>
    <section className={styles.periodBar} aria-label="Período aplicado"><div><strong>Período aplicado</strong><span>{period} · {ANALYTICS_TIMEZONE}</span></div><div className={styles.presets} role="group" aria-label="Períodos rápidos">{([["today", "Hoy"], ["7", "Últimos 7 días"], ["30", "Últimos 30 días"], ["custom", "Personalizado"], ["all", "Todo el historial"]] as const).map(([value, label]) => <button key={value} type="button" className={preset === value ? styles.presetActive : styles.preset} aria-pressed={preset === value} onClick={() => applyPreset(value)}>{label}</button>)}</div></section>
    {preset === "custom" || (preset !== "today" && preset !== "7" && preset !== "30" && preset !== "all") ? <form className={styles.filters} aria-label="Período personalizado" onSubmit={applyCustom}><Input label="Desde" type="date" value={draftFrom} onChange={setDraftFrom} /><Input label="Hasta" type="date" value={draftTo} onChange={setDraftTo} /><Button type="submit" onClick={() => undefined}>Aplicar período</Button></form> : null}
    {filterError ? <p role="alert">{filterError}</p> : null}{loading ? <p role="status">Cargando analítica…</p> : null}{error ? <p role="alert">{error}</p> : null}
    {!loading && !error && !hasData ? <section className={styles.empty} aria-live="polite"><h3>Sin ventas en este período</h3><p>Elegí otro período. Los días sin actividad aparecen como cero en el detalle.</p></section> : null}
    {!loading && !error && hasData ? <>
      <section className={styles.summary} aria-label="Resumen del período"><Panel title="Ventas cerradas"><strong className={styles.metric}>{money(data.grossSalesCents, data.currencyCode)}</strong><span>Impuestos incluidos</span></Panel><Panel title="Órdenes cerradas"><strong className={styles.metric}>{data.orderCount}</strong><span>Registros de ventas</span></Panel><Panel title="Promedio por orden"><strong className={styles.metric}>{money(data.averageOrderCents, data.currencyCode)}</strong><span>Ventas ÷ órdenes</span></Panel><Panel title="Cobrado al cierre"><strong className={styles.metric}>{money(data.collectedCents, data.currencyCode)}</strong><span>No se suma a ventas</span></Panel></section>
      <Panel title="Tendencia de ventas"><div className={styles.trend} role="img" aria-label={`Tendencia de ventas cerradas, ${trendRows.length} puntos; total del período ${money(data.grossSalesCents, data.currencyCode)}`}>{trendRows.map((row) => <div className={styles.trendItem} key={`${row.date}-${row.currencyCode}`}><span className={styles.trendBar} style={{ height: `${Math.max(6, row.totalCents / trendMax * 100)}%` }} /><span>{row.date.slice(5)}</span></div>)}</div><p className={styles.summaryText}>Total representado: <strong>{money(data.grossSalesCents, data.currencyCode)}</strong>. Granularidad: {data.trendGranularity === "day" ? "diaria" : data.trendGranularity === "week" ? "semanal" : "mensual"}.</p><Button variant="secondary" onClick={() => { setDetail(detail === "daily" ? null : "daily"); setDailyPageNumber(0); }}>{detail === "daily" ? "Ocultar detalle diario" : "Ver detalle diario"}</Button></Panel>
      {detail === "daily" ? <Panel title="Detalle diario"><div className={styles.detailHeader}><span>{dailyPage ? `${dailyPage.total} días en el período` : "Cargando días…"}</span></div>{dailyLoading ? <p role="status">Cargando detalle diario…</p> : dailyPage ? <><div className={styles.tableWrap}><table><caption>Ventas cerradas por día comercial</caption><thead><tr><th scope="col">Fecha</th><th scope="col">Ventas cerradas</th></tr></thead><tbody>{dailyPage.rows.map((row) => <tr key={row.date}><td>{row.date}</td><td>{money(row.totalCents, row.currencyCode)}</td></tr>)}</tbody></table></div><Pagination page={dailyPageNumber} pages={maxDailyPages} onPage={setDailyPageNumber} label="días" /></> : null}</Panel> : null}
      <section className={styles.details} aria-label="Detalles de ventas"><Panel title="Productos principales"><div className={styles.topProducts}>{data.productMix.slice(0, 5).map((row) => <div className={styles.productRow} key={`${row.productId}-${row.name}`}><span>{row.name}</span><strong>{money(row.revenueCents, row.currencyCode)}</strong></div>)}</div><Button variant="secondary" onClick={() => { setDetail("products"); setProductPageNumber(0); }}>Ver todos los productos</Button></Panel><Panel title="Medios de pago"><div className={styles.paymentRows}>{data.paymentMix.map((row) => <div className={styles.productRow} key={`${row.methodCode}-${row.currencyCode}`}><span>{paymentLabel(row.methodLabel, row.methodCode)}</span><strong>{money(row.amountCents, row.currencyCode)}</strong></div>)}</div></Panel></section>
      {detail === "products" ? <Panel title="Todos los productos vendidos"><div className={styles.productControls}><Input label="Buscar producto vendido" value={productSearchDraft} onChange={setProductSearchDraft} placeholder="Nombre del producto" /><Button onClick={() => { setProductSearch(productSearchDraft.trim()); setProductPageNumber(0); }}>Buscar</Button><label className={styles.selectLabel} htmlFor="product-sort">Ordenar por<select id="product-sort" value={productSort} onChange={(event) => { setProductSort(event.target.value as "revenue" | "quantity"); setProductPageNumber(0); }}><option value="revenue">Ventas</option><option value="quantity">Unidades</option></select></label></div>{productLoading ? <p role="status">Buscando productos…</p> : productPage && productPage.total === 0 ? <p role="status">No hay productos que coincidan con “{productSearch}”.</p> : productPage ? <><p className={styles.resultCount}>{productPage.total} resultado(s) · orden: {productSort === "revenue" ? "ventas" : "unidades"}</p><div className={styles.tableWrap}><table><caption>Productos vendidos en el período aplicado</caption><thead><tr><th scope="col">Producto</th>{showPresentation ? <th scope="col">Presentación</th> : null}<th scope="col">Unidades</th><th scope="col">Ventas</th></tr></thead><tbody>{productPage.rows.map((row) => <tr key={`${row.productId}-${row.name}-${row.currencyCode}`}><td>{row.name}</td>{showPresentation ? <td>{row.presentationSize}</td> : null}<td>{row.quantity}</td><td>{money(row.revenueCents, row.currencyCode)}</td></tr>)}</tbody></table></div><Pagination page={productPageNumber} pages={maxProductPages} onPage={setProductPageNumber} label="productos" /></> : null}</Panel> : null}
      <aside className={styles.operational}><strong>Saldo pendiente vigente</strong><span>Es información operativa, separada del período histórico.</span><a href="#pending-debts">Ver Cuentas por cobrar</a></aside>
    </> : null}
  </div>;
}

function Pagination({ page, pages, onPage, label }: { page: number; pages: number; onPage: (page: number) => void; label: string }): JSX.Element | null {
  if (pages <= 1) return null;
  return <nav className={styles.pagination} aria-label={`Paginación de ${label}`}><Button variant="secondary" disabled={page === 0} onClick={() => onPage(page - 1)}>Anterior</Button><span>Página {page + 1} de {pages}</span><Button variant="secondary" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>Siguiente</Button></nav>;
}
