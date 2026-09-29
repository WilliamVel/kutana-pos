import type { PourSize } from "@kutana/shared/catalog/model/product.js";
import { Icon } from "../atoms/Icon.js";
import { PriceTag } from "./PriceTag.js";
import { formatCents } from "./format-cents.js";
import styles from "./LineItemRow.module.css";

export type LinePaymentStatus = "paid" | "partial" | "pending" | "new" | "sent" | "void";
export type LineItemRowLayout = "table" | "mobile";

export interface LineItemRowProps {
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly totalCents: number;
  readonly settlementTotalCents?: number;
  readonly pourSizeMl?: PourSize | null;
  readonly isAdjustment?: boolean;
  readonly statusLabel?: LinePaymentStatus;
  readonly paidCents?: number;
  readonly onRemove?: () => void;
  readonly readOnly?: boolean;
  readonly layout?: LineItemRowLayout;
}

function displayName(name: string, pourSizeMl?: PourSize | null): string {
  if (!pourSizeMl) return name;
  return name.replace(new RegExp(`\\s*${pourSizeMl}\\s*ml\\b`, "i"), "").trim();
}

const statusCopy: Record<
  LinePaymentStatus,
  { label: string; icon: "check" | "progress" | "warning" }
> = {
  paid: { label: "Pagado", icon: "check" },
  partial: { label: "Parcial", icon: "progress" },
  pending: { label: "Pendiente", icon: "warning" },
  new: { label: "Nuevo", icon: "warning" },
  sent: { label: "Enviado", icon: "check" },
  void: { label: "Anulado", icon: "warning" },
};

function Status({
  statusLabel,
  quantity,
  paidCents = 0,
  settlementTotalCents = 0,
}: {
  readonly statusLabel?: LinePaymentStatus;
  readonly quantity: number;
  readonly paidCents?: number;
  readonly settlementTotalCents?: number;
}): JSX.Element | null {
  const status = statusLabel ? statusCopy[statusLabel] : null;
  if (!status) return null;
  const settlementUnitCents =
    quantity > 0 ? Math.round(settlementTotalCents / quantity) : 0;
  const paidWholeUnits =
    settlementUnitCents > 0
      ? Math.min(quantity, Math.floor(paidCents / settlementUnitCents))
      : 0;
  const representedPaidCents =
    paidWholeUnits > 0 ? paidWholeUnits * settlementUnitCents : Math.max(0, paidCents);
  const detail =
    statusLabel === "partial" && paidCents > 0
      ? ` · ${formatCents(representedPaidCents)} de ${formatCents(settlementTotalCents)}`
      : "";
  return (
    <>
      <Icon name={status.icon} size={14} />
      {status.label}
      {detail}
    </>
  );
}

function ProductDetails({
  name,
  pourSizeMl,
  isAdjustment,
  statusLabel,
  quantity,
  paidCents,
  settlementTotalCents,
}: Pick<
  LineItemRowProps,
  | "name"
  | "pourSizeMl"
  | "isAdjustment"
  | "statusLabel"
  | "quantity"
  | "paidCents"
  | "settlementTotalCents"
>): JSX.Element {
  const variant = pourSizeMl ? `${pourSizeMl} ml` : isAdjustment ? "Ajuste" : "";
  return (
    <>
      <span className={styles.name}>
        {displayName(name, pourSizeMl)}
        {displayName(name, pourSizeMl) !== name ? (
          <span className={styles.srOnly}>{name}</span>
        ) : null}
        <span className={styles.srOnly}>x{quantity}</span>
      </span>
      {variant || statusLabel ? (
        <span className={styles.variant}>
          {variant}
          {variant && statusLabel ? " · " : ""}
          {statusLabel ? (
            <span className={styles.paymentStatus}>
              <Status
                statusLabel={statusLabel}
                quantity={quantity}
                paidCents={paidCents}
                settlementTotalCents={settlementTotalCents}
              />
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  );
}

function Action({
  name,
  pourSizeMl,
  onRemove,
  readOnly = false,
}: Pick<LineItemRowProps, "name" | "pourSizeMl" | "onRemove" | "readOnly">): JSX.Element {
  return (
    <span className={styles.actionCell}>
      {readOnly ? null : onRemove ? (
        <button
          type="button"
          className={styles.remove}
          aria-label={`Eliminar ${displayName(name, pourSizeMl)}`}
          title={`Eliminar ${displayName(name, pourSizeMl)}`}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <Icon name="trash" size={18} />
        </button>
      ) : (
        <span className={styles.actionPlaceholder} aria-hidden="true" />
      )}
    </span>
  );
}

/** Shared data/handlers rendered by the desktop table and mobile list layouts. */
export function LineItemRow({
  name,
  quantity,
  unitPriceCents,
  totalCents,
  pourSizeMl,
  isAdjustment = false,
  statusLabel,
  paidCents = 0,
  settlementTotalCents = totalCents,
  onRemove,
  readOnly = false,
  layout = "mobile",
}: LineItemRowProps): JSX.Element {
  if (layout === "table") {
    return (
      <tr className={styles.tableRow} data-status={statusLabel ?? "normal"}>
        <td className={styles.quantityCell}>
          <span
            className={styles.quantity}
            aria-label={`${quantity} ${quantity === 1 ? "unidad" : "unidades"}, solo lectura`}
          >
            {quantity}×
          </span>
        </td>
        <td className={styles.productCell}>
          <div className={styles.productDetails}>
            <ProductDetails
              name={name}
              quantity={quantity}
              pourSizeMl={pourSizeMl}
              isAdjustment={isAdjustment}
              statusLabel={statusLabel}
              paidCents={paidCents}
              settlementTotalCents={settlementTotalCents}
            />
          </div>
        </td>
        <td className={styles.priceCell}>
          <PriceTag cents={unitPriceCents} /> c/u
        </td>
        <td className={styles.totalCell}>
          <PriceTag cents={unitPriceCents * quantity} />
        </td>
        <td className={styles.actionTableCell}>
          <Action name={name} pourSizeMl={pourSizeMl} onRemove={onRemove} readOnly={readOnly} />
        </td>
      </tr>
    );
  }

  return (
    <div
      className={`${styles.mobileRow} ${readOnly ? styles.readOnlyRow : ""}`}
      data-status={statusLabel ?? "normal"}
      tabIndex={readOnly ? undefined : 0}
    >
      <span className={styles.quantityCell}>
        <span
          className={styles.quantity}
          aria-label={`${quantity} ${quantity === 1 ? "unidad" : "unidades"}, solo lectura`}
        >
          {quantity}×
        </span>
      </span>
      <div className={styles.mobileProduct}>
        <ProductDetails
          name={name}
          quantity={quantity}
          pourSizeMl={pourSizeMl}
          isAdjustment={isAdjustment}
          statusLabel={statusLabel}
          paidCents={paidCents}
          settlementTotalCents={settlementTotalCents}
        />
      </div>
      <span className={styles.mobilePrice}>
        <PriceTag cents={unitPriceCents} /> c/u
      </span>
      <span className={styles.mobileTotal}>
        <PriceTag cents={unitPriceCents * quantity} />
      </span>
      <Action name={name} pourSizeMl={pourSizeMl} onRemove={onRemove} readOnly={readOnly} />
    </div>
  );
}
