import { useEffect, useRef, useState } from "react";
import type { PourSize } from "@kutana/shared/catalog/model/product.js";
import { LineItemRow, type LinePaymentStatus } from "../../../design-system/molecules/LineItemRow.js";
import { PriceTag } from "../../../design-system/molecules/PriceTag.js";
import { Badge, type BadgeTone } from "../../../design-system/atoms/Badge.js";
import { StatusPill, type OrderStatus } from "../../../design-system/molecules/StatusPill.js";
import { formatCents } from "../../../design-system/molecules/format-cents.js";
import styles from "./OrderTicketPanel.module.css";

export interface OrderPaymentDetailMember {
  readonly id: string;
  readonly payerLabels: readonly string[];
  readonly paidCents: number;
  readonly status: "paid" | "partial" | "pending";
}

export interface OrderPaymentDetailLine {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly totalCents: number;
  readonly paidCents: number;
  readonly pourSizeMl: PourSize | null;
  readonly payerLabels: readonly string[];
  readonly paidQuantity: number;
  readonly pendingQuantity: number;
  readonly status: "paid" | "partial" | "pending";
  readonly members?: readonly OrderPaymentDetailMember[];
}

export interface OrderTicketPanelLine {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly totalCents: number;
  readonly settlementTotalCents?: number;
  readonly pourSizeMl: PourSize | null;
  readonly isAdjustment: boolean;
  readonly paymentStatus?: LinePaymentStatus;
  readonly paidCents?: number;
  readonly payerLabels?: readonly string[];
}

export interface OrderTicketPanelProps {
  readonly tableLabel: string;
  readonly status: OrderStatus;
  readonly lines: readonly OrderTicketPanelLine[];
  readonly subtotalCents: number;
  readonly taxCents: number;
  readonly totalCents: number;
  readonly paidCents?: number;
  readonly paidLineCount?: number;
  readonly pendingLineCount?: number;
  readonly paymentDetails?: readonly OrderPaymentDetailLine[];
  readonly onRemoveLine?: (lineId: string) => void;
}

function productLabel(name: string, pourSizeMl: PourSize | null): string {
  const normalized = name.replace(/(\d+)\s*ml\b/gi, "$1 ml").trim();
  if (!pourSizeMl) return normalized;
  const withoutEmbeddedSize = normalized.replace(new RegExp(`\\s*${pourSizeMl}\\s*ml\\b`, "i"), "").trim();
  return `${withoutEmbeddedSize} · ${pourSizeMl} ml`;
}

function statusCopy(status: OrderPaymentDetailLine["status"]): { label: string; tone: BadgeTone } {
  if (status === "paid") return { label: "Pagado", tone: "success" };
  if (status === "partial") return { label: "Parcial", tone: "warning" };
  return { label: "Pendiente", tone: "neutral" };
}

export function OrderTicketPanel({
  tableLabel,
  status,
  lines,
  subtotalCents,
  taxCents,
  totalCents,
  paidCents = 0,
  paidLineCount = 0,
  pendingLineCount = 0,
  paymentDetails = [],
  onRemoveLine,
}: OrderTicketPanelProps): JSX.Element {
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const hasPaymentDetails = paidCents > 0 || paidLineCount > 0;
  const accountTotalCents = subtotalCents + taxCents;
  const filteredDetails = paymentDetails.filter((line) =>
    filter === "all" || (filter === "paid" ? line.status !== "pending" : line.status !== "paid"),
  );

  useEffect(() => {
    if (!showPaymentDetails) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setShowPaymentDetails(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showPaymentDetails]);

  return (
    <section className={styles.panel} aria-label={`Resumen de orden para ${tableLabel}`}>
      <div className={styles.header}>
        <div><h2>{tableLabel}</h2><p className={styles.orderMeta}>{lines.reduce((count, line) => count + line.quantity, 0)} unidades · {lines.length} ítems</p></div>
        <StatusPill status={status} />
      </div>
      {lines.length === 0 ? <p className={styles.empty}>Todavía no hay productos en esta orden.</p> : <>
        <div className={styles.desktopLines} data-layout-products><table className={styles.lineTable}><colgroup><col className={styles.quantityColumn} /><col className={styles.productColumn} /><col className={styles.priceColumn} /><col className={styles.totalColumn} /><col className={styles.actionColumn} /></colgroup><thead><tr><th scope="col" /><th scope="col">Producto</th><th scope="col" className={styles.priceHeader}>Precio</th><th scope="col" className={styles.totalHeader}>Total</th><th scope="col" /></tr></thead><tbody>{lines.map((line) => <LineItemRow key={line.id} layout="table" name={line.name} quantity={line.quantity} unitPriceCents={line.unitPriceCents} totalCents={line.totalCents} settlementTotalCents={line.settlementTotalCents} pourSizeMl={line.pourSizeMl} isAdjustment={line.isAdjustment} statusLabel={line.paymentStatus} paidCents={line.paidCents} onRemove={onRemoveLine && !line.isAdjustment ? () => onRemoveLine(line.id) : undefined} />)}</tbody></table></div>
        <div className={styles.mobileLines}>{lines.map((line) => <LineItemRow key={line.id} layout="mobile" name={line.name} quantity={line.quantity} unitPriceCents={line.unitPriceCents} totalCents={line.totalCents} settlementTotalCents={line.settlementTotalCents} pourSizeMl={line.pourSizeMl} isAdjustment={line.isAdjustment} statusLabel={line.paymentStatus} paidCents={line.paidCents} onRemove={onRemoveLine && !line.isAdjustment ? () => onRemoveLine(line.id) : undefined} />)}</div>
      </>}
      <div className={styles.totals} data-layout-summary>
        <div className={styles.totalRow}><span>Subtotal</span><PriceTag cents={subtotalCents} /></div>
        <div className={styles.totalRow}><span>Impuestos</span><PriceTag cents={taxCents} /></div>
        <div className={styles.totalRow}><span>Total</span><PriceTag cents={accountTotalCents} /></div>
        {paidCents > 0 ? <div className={styles.totalRow}><span>Pagado</span><PriceTag cents={paidCents} /></div> : null}
        <div className={`${styles.totalRow} ${styles.grandTotal}`}><span>Saldo pendiente</span><PriceTag cents={totalCents} /></div>
        {hasPaymentDetails ? <><p className={styles.paymentSummary}>{paidLineCount} {paidLineCount === 1 ? "unidad pagada" : "unidades pagadas"} · {pendingLineCount} {pendingLineCount === 1 ? "pendiente" : "pendientes"}</p><button type="button" className={styles.paymentDetailsButton} onClick={() => setShowPaymentDetails(true)}>Ver detalle de pagos</button></> : null}
      </div>
      {showPaymentDetails ? <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => setShowPaymentDetails(false)}>
        <section className={styles.paymentModal} role="dialog" aria-modal="true" aria-labelledby="order-payment-details-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className={styles.paymentModalHeader}>
            <div><p className={styles.paymentEyebrow}>Detalle de pagos</p><h3 id="order-payment-details-title">{tableLabel}</h3></div>
            <button ref={closeButtonRef} type="button" className={styles.closeModalButton} onClick={() => setShowPaymentDetails(false)} aria-label="Cerrar detalle de pagos">×</button>
          </div>
          <div className={styles.paymentOverview} aria-label="Resumen del pago">
            <div><span>Total</span><strong>{formatCents(accountTotalCents)}</strong></div>
            <div><span>Pagado</span><strong>{formatCents(paidCents)}</strong></div>
            <div><span>Pendiente</span><strong>{formatCents(totalCents)}</strong></div>
            <div><span>Unidades</span><strong>{paidLineCount} / {pendingLineCount}</strong><small>pagadas / pendientes</small></div>
          </div>
          <div className={styles.paymentFilters} role="tablist" aria-label="Filtrar productos por estado">
            {(["all", "paid", "pending"] as const).map((value) => <button key={value} type="button" role="tab" aria-selected={filter === value} className={filter === value ? styles.activeFilter : undefined} onClick={() => setFilter(value)}>{value === "all" ? "Todos" : value === "paid" ? "Pagados" : "Pendientes"}</button>)}
          </div>
          <div className={styles.paymentList}>
            {filteredDetails.map((line) => { const copy = statusCopy(line.status); return <article className={styles.paymentLine} key={line.id}>
              <div className={styles.paymentLineMain}><div className={styles.paymentLineTitle}><strong>{productLabel(line.name, line.pourSizeMl)} × {line.quantity}</strong><Badge tone={copy.tone}>{copy.label}</Badge></div><small>{line.quantity > 1 ? `${line.paidQuantity} pagada${line.paidQuantity === 1 ? "" : "s"} · ${line.pendingQuantity} pendiente${line.pendingQuantity === 1 ? "" : "s"}` : line.payerLabels.length > 0 ? line.payerLabels.join(", ") : ""}</small></div>
              <div className={styles.paymentAmounts}><strong>{formatCents(line.totalCents)}</strong>{line.status !== "paid" ? <small>{formatCents(line.paidCents)} pagado · {formatCents(Math.max(0, line.totalCents - line.paidCents))} pendiente</small> : <small>{formatCents(line.unitPriceCents)} c/u</small>}</div>
              {line.members && line.members.length > 1 ? <details className={styles.paymentMembers}><summary>Ver asignación por unidad</summary>{line.members.map((member) => <div key={member.id}><span>{member.payerLabels.length > 0 ? member.payerLabels.join(", ") : "Asignación no disponible"}</span><span>{formatCents(member.paidCents)} pagado</span></div>)}</details> : null}
            </article>; })}
            {filteredDetails.length === 0 ? <p className={styles.empty}>No hay productos en este filtro.</p> : null}
          </div>
        </section>
      </div> : null}
    </section>
  );
}
