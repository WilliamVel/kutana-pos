import { useEffect, useRef, useState } from "react";
import type { PourSize } from "@kutana/shared/catalog/model/product.js";
import {
  LineItemRow,
  type LinePaymentStatus,
} from "../../../design-system/molecules/LineItemRow.js";
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
  readonly productId?: string;
  readonly name: string;
  readonly quantity: number;
  readonly pendingQuantity?: number;
  readonly unitPriceCents: number;
  readonly totalCents: number;
  readonly settlementTotalCents?: number;
  readonly pourSizeMl: PourSize | null;
  readonly isAdjustment: boolean;
  readonly paymentStatus?: LinePaymentStatus;
  /** Presentation-only discriminator; paymentStatus remains the persisted/rendering status. */
  readonly paymentSegment?: "paid" | "pending";
  readonly paidCents?: number;
  readonly payerLabels?: readonly string[];
  readonly canRemove?: boolean;
}

export interface SelectedProductLine {
  readonly lineId: string;
  readonly quantity: number;
}

export interface OrderTicketPanelSection {
  readonly label: "Bebidas" | "Comida" | "Ajustes";
  readonly lines: readonly OrderTicketPanelLine[];
}

export interface OrderTicketPanelProps {
  readonly tableLabel: string;
  readonly status: OrderStatus;
  readonly lines: readonly OrderTicketPanelLine[];
  readonly sections?: readonly OrderTicketPanelSection[];
  readonly subtotalCents: number;
  readonly taxCents: number;
  readonly totalCents: number;
  readonly paidCents?: number;
  readonly paidLineCount?: number;
  readonly pendingLineCount?: number;
  readonly paymentDetails?: readonly OrderPaymentDetailLine[];
  readonly removeBlockedMessage?: string | null;
  readonly onRemoveLine?: (lineId: string) => void;
  readonly selectionMode?: boolean;
  readonly selectedProducts?: readonly SelectedProductLine[];
  readonly onSelectionChange?: (selection: readonly SelectedProductLine[]) => void;
  readonly onReviewSelectedProducts?: (selection: readonly SelectedProductLine[]) => void;
}

function productLabel(name: string, pourSizeMl: PourSize | null): string {
  const normalized = name.replace(/(\d+)\s*ml\b/gi, "$1 ml").trim();
  if (!pourSizeMl) return normalized;
  const withoutEmbeddedSize = normalized
    .replace(new RegExp(`\\s*${pourSizeMl}\\s*ml\\b`, "i"), "")
    .trim();
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
  sections,
  subtotalCents,
  taxCents,
  totalCents,
  paidCents = 0,
  paidLineCount = 0,
  pendingLineCount = 0,
  paymentDetails = [],
  removeBlockedMessage = null,
  onRemoveLine,
  selectionMode = false,
  selectedProducts = [],
  onSelectionChange,
  onReviewSelectedProducts,
}: OrderTicketPanelProps): JSX.Element {
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [showSelectionReview, setShowSelectionReview] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [filter, setFilter] = useState<"paid" | "pending">("pending");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "pending">("all");
  const selectedById = new Map(selectedProducts.map((item) => [item.lineId, item.quantity]));
  const selectedUnits = selectedProducts.reduce((sum, item) => sum + item.quantity, 0);
  const isPaidSegment = (line: OrderTicketPanelLine): boolean =>
    line.paymentSegment === "paid" ||
    (line.paymentSegment === undefined && line.paymentStatus === "paid");
  const isPendingSegment = (line: OrderTicketPanelLine): boolean => !isPaidSegment(line);
  const selectableLineById = (lineId: string): OrderTicketPanelLine | undefined =>
    lines.find((candidate) => candidate.id === lineId && isPendingSegment(candidate));
  const selectedCents = selectedProducts.reduce((sum, item) => {
    const line = selectableLineById(item.lineId);
    if (!line) return sum;
    const unitCents =
      line.quantity > 0
        ? Math.round((line.settlementTotalCents ?? line.totalCents) / line.quantity)
        : 0;
    return sum + unitCents * item.quantity;
  }, 0);
  const updateSelection = (line: OrderTicketPanelLine, quantity: number): void => {
    const max = line.pendingQuantity ?? line.quantity;
    const next = selectedProducts.filter((item) => item.lineId !== line.id);
    if (quantity > 0)
      next.push({ lineId: line.id, quantity: Math.min(max, Math.max(0, quantity)) });
    onSelectionChange?.(next);
  };
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const reviewCloseButtonRef = useRef<HTMLButtonElement>(null);
  const reviewDialogRef = useRef<HTMLElement>(null);
  const reviewOpenerRef = useRef<HTMLElement | null>(null);
  const paymentDetailsOpenerRef = useRef<HTMLElement | null>(null);
  const hasPaymentDetails = paidCents > 0 || paidLineCount > 0;
  const accountTotalCents = subtotalCents + taxCents;
  const filteredDetails = paymentDetails.filter(
    (line) =>
      paymentFilter === "all" ||
      (paymentFilter === "paid" ? line.status !== "pending" : line.status !== "paid"),
  );
  const displayedSections = sections ?? [{ label: "Comida" as const, lines }];
  const paidUnitCount = displayedSections.reduce(
    (sum, section) =>
      sum +
      section.lines.reduce(
        (sectionSum, line) => sectionSum + (isPaidSegment(line) ? line.quantity : 0),
        0,
      ),
    0,
  );
  const pendingUnitCount = displayedSections.reduce(
    (sum, section) =>
      sum +
      section.lines.reduce(
        (sectionSum, line) => sectionSum + (isPendingSegment(line) ? line.quantity : 0),
        0,
      ),
    0,
  );
  const hasPaidRows = paidUnitCount > 0;
  useEffect(() => {
    if (!hasPaidRows && filter === "paid") setFilter("pending");
  }, [filter, hasPaidRows]);
  const filteredSections = displayedSections
    .map((section) => ({
      ...section,
      lines: section.lines.filter((line) =>
        filter === "paid" ? isPaidSegment(line) : isPendingSegment(line),
      ),
    }))
    .filter((section) => section.lines.length > 0);
  const hasRemovableLines = Boolean(
    onRemoveLine && lines.some((line) => !line.isAdjustment && line.canRemove !== false),
  );
  const renderLine = (line: OrderTicketPanelLine, layout: "table" | "mobile"): JSX.Element => (
    <LineItemRow
      key={line.id}
      layout={layout}
      name={line.name}
      quantity={line.quantity}
      unitPriceCents={line.unitPriceCents}
      totalCents={line.totalCents}
      settlementTotalCents={line.settlementTotalCents}
      pourSizeMl={line.pourSizeMl}
      isAdjustment={line.isAdjustment}
      statusLabel={line.paymentStatus}
      paidCents={line.paidCents}
      onRemove={
        onRemoveLine && !line.isAdjustment && line.canRemove !== false
          ? () => onRemoveLine(line.id)
          : undefined
      }
    />
  );
  const regularDesktopLines = filteredSections.flatMap((section) => [
    <tr key={`${section.label}-header`} className={styles.sectionHeader}>
      <th colSpan={5} scope="colgroup">
        {section.label}
      </th>
    </tr>,
    ...section.lines.map((line) => renderLine(line, "table")),
  ]);
  const regularMobileLines = filteredSections.flatMap((section) => [
    <h3 key={`${section.label}-header`} className={styles.sectionHeader}>
      {section.label}
    </h3>,
    ...section.lines.map((line) => renderLine(line, "mobile")),
  ]);
  const selectionRows = filteredSections.flatMap((section) => [
    <h3 key={`${section.label}-selection-header`} className={styles.sectionHeader}>
      {section.label}
    </h3>,
    ...section.lines.map((line) => {
      const max = line.pendingQuantity ?? line.quantity;
      const selected = selectedById.get(line.id) ?? 0;
      const unitCents =
        line.quantity > 0
          ? Math.round((line.settlementTotalCents ?? line.totalCents) / line.quantity)
          : 0;
      return (
        <article className={styles.selectionRow} key={line.id}>
          <label className={styles.selectionCheck}>
            <input
              type="checkbox"
              checked={selected > 0}
              disabled={max <= 0 || line.isAdjustment}
              onChange={(event) =>
                updateSelection(line, event.target.checked ? Math.min(1, max) : 0)
              }
            />
            <span>
              <strong>
                {line.quantity}× {line.name}
              </strong>
              <small>
                {max} {max === 1 ? "unidad disponible" : "unidades disponibles"} ·{" "}
                <PriceTag cents={unitCents} /> c/u
              </small>
            </span>
          </label>
          {selected > 0 ? (
            <div className={styles.quantityPicker}>
              <span>Cantidad</span>
              {max > 1 ? (
                <button
                  type="button"
                  aria-label={`Disminuir cantidad de ${line.name}`}
                  disabled={selected <= 1}
                  onClick={() => updateSelection(line, selected - 1)}
                >
                  ▼
                </button>
              ) : null}
              <input
                aria-label={`Cantidad de ${line.name}`}
                type="number"
                min={1}
                max={max}
                value={selected}
                onChange={(event) => updateSelection(line, Number(event.target.value) || 0)}
              />
              {max > 1 ? (
                <button
                  type="button"
                  aria-label={`Aumentar cantidad de ${line.name}`}
                  disabled={selected >= max}
                  onClick={() => updateSelection(line, selected + 1)}
                >
                  ▲
                </button>
              ) : null}
            </div>
          ) : null}
          <strong>
            <PriceTag cents={unitCents * selected} />
          </strong>
        </article>
      );
    }),
  ]);

  const closeSelectionReview = (): void => {
    setShowSelectionReview(false);
    setReviewSubmitting(false);
    window.setTimeout(() => reviewOpenerRef.current?.focus(), 0);
  };
  const closePaymentDetails = (): void => {
    setShowPaymentDetails(false);
    window.setTimeout(() => paymentDetailsOpenerRef.current?.focus(), 0);
  };

  useEffect(() => {
    if (!showPaymentDetails && !showSelectionReview) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const activeDialog = showPaymentDetails ? closeButtonRef.current : reviewDialogRef.current;
    const firstFocusable = showPaymentDetails
      ? closeButtonRef.current
      : reviewDialogRef.current?.querySelector<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
    (firstFocusable ?? activeDialog)?.focus();
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (showSelectionReview) closeSelectionReview();
        else closePaymentDetails();
        return;
      }
      if (event.key !== "Tab" || !showSelectionReview || !reviewDialogRef.current) return;
      const focusable = Array.from(
        reviewDialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showPaymentDetails, showSelectionReview]);

  const productContent =
    lines.length === 0 ? (
      <p className={styles.empty}>Todavía no hay productos en esta orden.</p>
    ) : (
      <>
        <div
          className={styles.productFilters}
          role="tablist"
          aria-label="Filtrar productos por pago"
        >
          <button
            type="button"
            role="tab"
            aria-selected={filter === "pending"}
            className={filter === "pending" ? styles.activeProductFilter : undefined}
            onClick={() => setFilter("pending")}
          >
            Pendientes · {pendingUnitCount}
          </button>
          {hasPaidRows ? (
            <button
              type="button"
              role="tab"
              aria-selected={filter === "paid"}
              className={filter === "paid" ? styles.activeProductFilter : undefined}
              onClick={() => setFilter("paid")}
            >
              Pagados · {paidUnitCount}
            </button>
          ) : null}
        </div>
        {filteredSections.length === 0 ? (
          <p className={styles.empty}>No hay productos en este filtro.</p>
        ) : selectionMode ? (
          <div className={styles.selectionList} aria-label="Seleccionar productos para cobrar">
            {selectionRows}
          </div>
        ) : (
          <div>
            <div
              className={`${styles.desktopLines} ${hasRemovableLines ? styles.hasActions : styles.noActions}`}
              data-layout-products
            >
              <table
                className={`${styles.lineTable} ${hasRemovableLines ? styles.hasActions : styles.noActions}`}
              >
                <colgroup>
                  <col className={styles.quantityColumn} />
                  <col className={styles.productColumn} />
                  <col className={styles.priceColumn} />
                  <col className={styles.totalColumn} />
                  <col className={styles.actionColumn} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col" />
                    <th scope="col">Producto</th>
                    <th scope="col" className={styles.priceHeader}>
                      Precio
                    </th>
                    <th scope="col" className={styles.totalHeader}>
                      Total
                    </th>
                    <th scope="col" />
                  </tr>
                </thead>
                <tbody>{regularDesktopLines}</tbody>
              </table>
            </div>
            <div
              className={`${styles.mobileLines} ${hasRemovableLines ? styles.hasActions : styles.noActions}`}
            >
              {regularMobileLines}
            </div>
          </div>
        )}
      </>
    );

  return (
    <section className={styles.panel} aria-label={`Resumen de orden para ${tableLabel}`}>
      <div className={styles.header}>
        <div>
          <h2>{tableLabel}</h2>
          <p className={styles.orderMeta}>
            {lines.reduce((count, line) => count + line.quantity, 0)} unidades · {lines.length}{" "}
            ítems
          </p>
        </div>
        <StatusPill status={status} />
      </div>
      {removeBlockedMessage ? <p role="alert">{removeBlockedMessage}</p> : null}
      {productContent}
      <div className={styles.totals} data-layout-summary>
        <div className={styles.totalRow}>
          <span>Subtotal</span>
          <PriceTag cents={subtotalCents} />
        </div>
        {taxCents > 0 ? (
          <div className={styles.totalRow}>
            <span>Impuestos</span>
            <PriceTag cents={taxCents} />
          </div>
        ) : null}
        <div className={styles.totalRow}>
          <span>Total de la orden</span>
          <PriceTag cents={accountTotalCents} />
        </div>
        <div className={styles.totalRow}>
          <span>Pagado</span>
          <PriceTag cents={paidCents} />
        </div>
        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
          <span>Saldo pendiente</span>
          <PriceTag cents={totalCents} />
        </div>
        {hasPaymentDetails ? (
          <>
            <p className={styles.paymentSummary}>
              {paidLineCount} {paidLineCount === 1 ? "unidad pagada" : "unidades pagadas"} ·{" "}
              {pendingLineCount} {pendingLineCount === 1 ? "pendiente" : "pendientes"}
            </p>
            <button
              type="button"
              className={styles.paymentDetailsButton}
              onClick={(event) => {
                paymentDetailsOpenerRef.current = event.currentTarget;
                setShowPaymentDetails(true);
              }}
            >
              Ver detalle de pagos
            </button>
          </>
        ) : null}
      </div>
      {selectionMode ? (
        <div className={styles.selectionSummary} aria-live="polite">
          <span>
            {selectedUnits} {selectedUnits === 1 ? "unidad" : "unidades"} seleccionadas ·{" "}
            <PriceTag cents={selectedCents} />
          </span>
          <button
            type="button"
            disabled={selectedUnits === 0}
            onClick={(event) => {
              reviewOpenerRef.current = event.currentTarget;
              setShowSelectionReview(true);
            }}
          >
            Revisar y cobrar
          </button>
        </div>
      ) : null}
      {showSelectionReview ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={closeSelectionReview}
        >
          <section
            ref={reviewDialogRef}
            className={styles.paymentModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-review-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.paymentModalHeader}>
              <div>
                <p className={styles.paymentEyebrow}>Revisión del cobro</p>
                <h3 id="product-review-title">{tableLabel}</h3>
              </div>
              <button
                type="button"
                className={styles.closeModalButton}
                ref={reviewCloseButtonRef}
                onClick={closeSelectionReview}
                aria-label="Cerrar revisión del cobro"
              >
                ×
              </button>
            </div>
            <div className={styles.selectionReviewList}>
              {selectedProducts.map((item) => {
                const line = selectableLineById(item.lineId);
                if (!line) return null;
                const unitCents =
                  line.quantity > 0
                    ? Math.round((line.settlementTotalCents ?? line.totalCents) / line.quantity)
                    : 0;
                return (
                  <div key={item.lineId} className={styles.totalRow}>
                    <span>
                      {item.quantity}× {line.name}
                    </span>
                    <strong>
                      <PriceTag cents={unitCents * item.quantity} />
                    </strong>
                  </div>
                );
              })}
            </div>
            <div className={styles.selectionReviewTotals}>
              <div className={styles.totalRow}>
                <span>Total a cobrar</span>
                <strong>
                  <PriceTag cents={selectedCents} />
                </strong>
              </div>
              <div className={`${styles.totalRow} ${styles.remainingTotal}`}>
                <span>
                  Saldo restante
                  <small>Después de este cobro</small>
                </span>
                <strong>
                  <PriceTag cents={Math.max(0, totalCents - selectedCents)} />
                </strong>
              </div>
            </div>
            <div className={styles.selectionReviewActions}>
              <button type="button" onClick={closeSelectionReview}>
                Volver a editar
              </button>
              <button
                type="button"
                disabled={reviewSubmitting}
                aria-label={
                  reviewSubmitting ? "Procesando cobro" : `Cobrar ${formatCents(selectedCents)}`
                }
                onClick={() => {
                  if (reviewSubmitting) return;
                  setReviewSubmitting(true);
                  onReviewSelectedProducts?.(selectedProducts);
                  closeSelectionReview();
                }}
              >
                <span>Cobrar</span>
                <span className={styles.actionAmount} aria-hidden="true">
                  {reviewSubmitting ? "Procesando…" : formatCents(selectedCents)}
                </span>
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {showPaymentDetails ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={closePaymentDetails}>
          <section
            className={styles.paymentModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-payment-details-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.paymentModalHeader}>
              <div>
                <p className={styles.paymentEyebrow}>Detalle de pagos</p>
                <h3 id="order-payment-details-title">{tableLabel}</h3>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className={styles.closeModalButton}
                onClick={closePaymentDetails}
                aria-label="Cerrar detalle de pagos"
              >
                ×
              </button>
            </div>
            <div className={styles.paymentOverview} aria-label="Resumen del pago">
              <div>
                <span>Total de la orden</span>
                <strong>{formatCents(accountTotalCents)}</strong>
              </div>
              <div>
                <span>Pagado</span>
                <strong>{formatCents(paidCents)}</strong>
              </div>
              <div>
                <span>Saldo pendiente</span>
                <strong>{formatCents(totalCents)}</strong>
              </div>
              <div>
                <span>Unidades</span>
                <strong>
                  {paidLineCount} / {pendingLineCount}
                </strong>
                <small>pagadas / pendientes</small>
              </div>
            </div>
            <div
              className={styles.paymentFilters}
              role="tablist"
              aria-label="Filtrar productos por estado"
            >
              {(["all", "paid", "pending"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={paymentFilter === value}
                  className={paymentFilter === value ? styles.activeFilter : undefined}
                  onClick={() => setPaymentFilter(value)}
                >
                  {value === "all" ? "Todos" : value === "paid" ? "Pagados" : "Pendientes"}
                </button>
              ))}
            </div>
            <div className={styles.paymentList}>
              {filteredDetails.map((line) => {
                const copy = statusCopy(line.status);
                return (
                  <article className={styles.paymentLine} key={line.id}>
                    <div className={styles.paymentLineMain}>
                      <div className={styles.paymentLineTitle}>
                        <strong>
                          {productLabel(line.name, line.pourSizeMl)} × {line.quantity}
                        </strong>
                        <Badge tone={copy.tone}>{copy.label}</Badge>
                      </div>
                      <small>
                        {line.quantity > 1
                          ? `${line.paidQuantity} pagada${line.paidQuantity === 1 ? "" : "s"} · ${line.pendingQuantity} pendiente${line.pendingQuantity === 1 ? "" : "s"}`
                          : line.payerLabels.length > 0
                            ? line.payerLabels.join(", ")
                            : ""}
                      </small>
                    </div>
                    <div className={styles.paymentAmounts}>
                      <strong>{formatCents(line.totalCents)}</strong>
                      {line.status !== "paid" ? (
                        <small>
                          {formatCents(line.paidCents)} pagado ·{" "}
                          {formatCents(Math.max(0, line.totalCents - line.paidCents))} pendiente
                        </small>
                      ) : (
                        <small>{formatCents(line.unitPriceCents)} c/u</small>
                      )}
                    </div>
                    {line.members && line.members.length > 1 ? (
                      <details className={styles.paymentMembers}>
                        <summary>Ver asignación por unidad</summary>
                        {line.members.map((member) => (
                          <div key={member.id}>
                            <span>
                              {member.payerLabels.length > 0
                                ? member.payerLabels.join(", ")
                                : "Asignación no disponible"}
                            </span>
                            <span>{formatCents(member.paidCents)} pagado</span>
                          </div>
                        ))}
                      </details>
                    ) : null}
                  </article>
                );
              })}
              {filteredDetails.length === 0 ? (
                <p className={styles.empty}>No hay productos en este filtro.</p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
