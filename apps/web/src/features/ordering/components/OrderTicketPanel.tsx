import { useState } from "react";
import type { PourSize } from "@kutana/shared/catalog/model/product.js";
import { LineItemRow, type LinePaymentStatus } from "../../../design-system/molecules/LineItemRow.js";
import { PriceTag } from "../../../design-system/molecules/PriceTag.js";
import { StatusPill, type OrderStatus } from "../../../design-system/molecules/StatusPill.js";
import styles from "./OrderTicketPanel.module.css";

export interface OrderPaymentDetailLine {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
  readonly payerLabels: readonly string[];
  readonly status: "paid" | "partial" | "pending";
}

export interface OrderTicketPanelLine {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
  /** Integer cents. */
  readonly unitPriceCents: number;
  /** Integer cents — visible pre-tax line subtotal. */
  readonly totalCents: number;
  /** Integer cents — persisted gross amount used only for payment state. */
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
  /** Integer cents — sum of line item subtotals (pre-tax). */
  readonly subtotalCents: number;
  /**
   * Integer cents — the SUM of each line item's persisted at-sale-time tax
   * (see `LineItem.taxCents`), never recomputed from the current catalog
   * tax rate. A later catalog rate change must not alter an already-sold
   * line's tax (spec: "Tax Persisted at Sale Time").
   */
  readonly taxCents: number;
  /** Integer cents — current balance remaining after personal-account payments. */
  readonly totalCents: number;
  /** Integer cents already paid through personal accounts. */
  readonly paidCents?: number;
  /** Number of products with a fully settled personal account. */
  readonly paidLineCount?: number;
  /** Number of products that still have an outstanding balance. */
  readonly pendingLineCount?: number;
  readonly paymentDetails?: readonly OrderPaymentDetailLine[];
  /**
   * When provided, each non-adjustment line gets a remove control. Only
   * wired for unpaid orders — the container omits it once the order is paid.
   */
  readonly onRemoveLine?: (lineId: string) => void;
}

/**
 * Purely presentational: props in, markup out, no port access. Renders one
 * table's active order summary before the operator assigns line quantities to
 * personal accounts.
 */
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
  const hasPaymentDetails = paidCents > 0 || paidLineCount > 0;

  return (
    <section className={styles.panel} aria-label={`Resumen de orden para ${tableLabel}`}>
      <div className={styles.header}>
        <div>
          <h2>{tableLabel}</h2>
          <p className={styles.orderMeta}>
            {lines.reduce((count, line) => count + line.quantity, 0)} unidades · {lines.length} ítems
          </p>
        </div>
        <StatusPill status={status} />
      </div>
      {lines.length === 0 ? (
        <p className={styles.empty}>Todavía no hay productos en esta orden.</p>
      ) : (
        <>
          <div className={styles.desktopLines} data-layout-products>
            <table className={styles.lineTable}>
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
                  <th scope="col" className={styles.priceHeader}>Precio</th>
                  <th scope="col" className={styles.totalHeader}>Total</th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <LineItemRow
                    key={line.id}
                    layout="table"
                    name={line.name}
                    quantity={line.quantity}
                    unitPriceCents={line.unitPriceCents}
                    totalCents={line.totalCents}
                    settlementTotalCents={line.settlementTotalCents}
                    pourSizeMl={line.pourSizeMl}
                    isAdjustment={line.isAdjustment}
                    statusLabel={line.paymentStatus}
                    paidCents={line.paidCents}
                    onRemove={onRemoveLine && !line.isAdjustment ? () => onRemoveLine(line.id) : undefined}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.mobileLines}>
            {lines.map((line) => (
              <LineItemRow
                key={line.id}
                layout="mobile"
                name={line.name}
                quantity={line.quantity}
                unitPriceCents={line.unitPriceCents}
                totalCents={line.totalCents}
                settlementTotalCents={line.settlementTotalCents}
                pourSizeMl={line.pourSizeMl}
                isAdjustment={line.isAdjustment}
                statusLabel={line.paymentStatus}
                paidCents={line.paidCents}
                onRemove={onRemoveLine && !line.isAdjustment ? () => onRemoveLine(line.id) : undefined}
              />
            ))}
          </div>
        </>
      )}

      <div className={styles.totals} data-layout-summary>
        <div className={styles.totalRow}>
          <span>Subtotal</span>
          <PriceTag cents={subtotalCents} />
        </div>
        <div className={styles.totalRow}>
          <span>Impuestos</span>
          <PriceTag cents={taxCents} />
        </div>
        <div className={styles.totalRow}>
          <span>Total</span>
          <PriceTag cents={subtotalCents + taxCents} />
        </div>
        {paidCents > 0 ? (
          <div className={styles.totalRow}>
            <span>Pagado</span>
            <PriceTag cents={paidCents} />
          </div>
        ) : null}
        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
          <span>Saldo pendiente</span>
          <PriceTag cents={totalCents} />
        </div>
        {hasPaymentDetails ? (
          <>
            <p className={styles.paymentSummary}>
              {paidLineCount} {paidLineCount === 1 ? "unidad pagada" : "unidades pagadas"} · {pendingLineCount} {pendingLineCount === 1 ? "pendiente" : "pendientes"}
            </p>
            <button
              type="button"
              className={styles.paymentDetailsButton}
              onClick={() => setShowPaymentDetails(true)}
            >
              Ver detalle de pagos
            </button>
          </>
        ) : null}
      </div>
      {showPaymentDetails ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={() => setShowPaymentDetails(false)}
        >
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
                type="button"
                className={styles.closeModalButton}
                onClick={() => setShowPaymentDetails(false)}
                aria-label="Cerrar detalle de pagos"
              >
                ×
              </button>
            </div>
            <ul className={styles.paymentList}>
              {paymentDetails.map((line) => (
                <li key={line.id}>
                  <span>
                    <strong>
                      {line.name} × {line.quantity}
                    </strong>
                    <small>
                      {line.payerLabels.length > 0 ? line.payerLabels.join(", ") : "Sin asignar"}
                    </small>
                  </span>
                  <span>
                    {line.status === "paid"
                      ? "Pagado"
                      : line.status === "partial"
                        ? "Pago parcial"
                        : "Pendiente"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </section>
  );
}
