import type { PourSize } from "@kutana/shared/catalog/model/product.js";
import { useEffect, useState } from "react";
import { Button } from "../../../design-system/atoms/Button.js";
import { Icon } from "../../../design-system/atoms/Icon.js";
import { Input } from "../../../design-system/atoms/Input.js";
import { LineItemRow } from "../../../design-system/molecules/LineItemRow.js";
import { PriceTag } from "../../../design-system/molecules/PriceTag.js";
import styles from "./RegisterPaymentPanel.module.css";

export interface RegisterPaymentPanelLine {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly totalCents: number;
  readonly pourSizeMl: PourSize | null;
  readonly isAdjustment: boolean;
}

export interface RegisterPaymentMethodOption {
  readonly code: string;
  readonly label: string;
  readonly requiresTendered: boolean;
}

export interface RegisterPaymentPanelProps {
  readonly title?: string;
  readonly subtitle?: string;
  readonly orderStatus?: string;
  readonly onBack?: () => void;
  readonly lines: readonly RegisterPaymentPanelLine[];
  readonly subtotalCents: number;
  readonly taxCents: number;
  readonly totalCents: number;
  readonly remainingBalanceCents: number;
  readonly amountToPayCents: number;
  readonly onAmountToPayChange: (cents: number) => void;
  readonly methods: readonly RegisterPaymentMethodOption[];
  readonly selectedMethodCode: string;
  readonly onSelectMethod: (code: string) => void;
  readonly tenderedCents: number | null;
  readonly onTenderedChange: (cents: number) => void;
  readonly changeDueCents: number | null;
  readonly onConfirmPayment: () => void;
  readonly canConfirm: boolean;
  readonly isProcessing?: boolean;
  readonly errorMessage?: string | null;
}

function parseDollarsToCents(input: string): number {
  if (!/^\d*(\.\d{0,2})?$/.test(input)) return 0;
  const [whole = "0", fraction = ""] = input.split(".");
  return (
    (Number.parseInt(whole || "0", 10) || 0) * 100 +
    (Number.parseInt(fraction.padEnd(2, "0"), 10) || 0)
  );
}

function formatCentsToDollarsInput(cents: number | null): string {
  if (cents === null) return "";
  return (Math.max(0, cents) / 100).toFixed(2);
}

function cashShortcuts(amountCents: number): number[] {
  const exact = Math.max(0, amountCents);
  const nextFive = Math.ceil(exact / 500) * 500;
  const candidates = [exact, nextFive, nextFive + 500, nextFive + 3500];
  return candidates.filter((value, index) => value > 0 && candidates.indexOf(value) === index);
}

function methodHint(method: RegisterPaymentMethodOption): string {
  if (method.requiresTendered) return "Ingresa el valor recibido para calcular el cambio.";
  const normalized = method.label.toLocaleLowerCase();
  if (normalized.includes("transfer")) return "Verifica que el dinero haya sido recibido";
  if (normalized.includes("qr")) return "Confirma el pago antes de continuar";
  return "";
}

export function RegisterPaymentPanel({
  title,
  subtitle,
  orderStatus = "Pendiente",
  onBack,
  lines,
  subtotalCents,
  taxCents,
  totalCents,
  remainingBalanceCents,
  amountToPayCents,
  onAmountToPayChange,
  methods,
  selectedMethodCode,
  onSelectMethod,
  tenderedCents,
  onTenderedChange,
  changeDueCents,
  onConfirmPayment,
  canConfirm,
  isProcessing = false,
  errorMessage = null,
}: RegisterPaymentPanelProps): JSX.Element {
  const selectedMethod = methods.find((method) => method.code === selectedMethodCode);
  const showTenderedInput = selectedMethod?.requiresTendered ?? false;
  const requiresManualConfirmation = Boolean(
    selectedMethod && !selectedMethod.requiresTendered && /transfer|qr/i.test(selectedMethod.label),
  );
  const [manualConfirmation, setManualConfirmation] = useState(false);
  useEffect(() => setManualConfirmation(false), [selectedMethodCode]);
  const postPaymentBalance = Math.max(0, remainingBalanceCents - amountToPayCents);
  const amountError =
    amountToPayCents <= 0
      ? "Ingresa un monto mayor que cero."
      : amountToPayCents > remainingBalanceCents
        ? "El monto no puede superar el saldo pendiente."
        : null;
  const tenderedError =
    showTenderedInput && tenderedCents !== null && tenderedCents < amountToPayCents
      ? `Faltan $${((amountToPayCents - tenderedCents) / 100).toFixed(2)}`
      : null;
  const blockingMessage =
    amountError ??
    tenderedError ??
    (!selectedMethod
      ? "Selecciona un método de pago."
      : showTenderedInput && tenderedCents === null
        ? "Ingresa el efectivo recibido para continuar."
        : requiresManualConfirmation && !manualConfirmation
          ? "Confirma que el pago fue recibido para continuar."
          : null);

  return (
    <section className={styles.panel} aria-label="Registrar pago">
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <p className={styles.eyebrow}>Cobro</p>
            <h2>Cobrar orden</h2>
            <p className={styles.orderContext}>
              {title ?? "Orden seleccionada"} · <span>{orderStatus}</span>
            </p>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {onBack ? (
            <button type="button" className={styles.backButton} onClick={onBack}>
              <Icon name="arrow-left" size={18} /> Volver al pedido
            </button>
          ) : null}
        </div>
      </header>

      <div className={styles.paymentGrid}>
        <section className={styles.productsPane} aria-label="Resumen de la orden">
          <div className={styles.paneHeader}>
            <h3>Productos incluidos</h3>
            <span data-numeric="true">
              {lines.reduce((count, line) => count + line.quantity, 0)}{" "}
              {lines.reduce((count, line) => count + line.quantity, 0) === 1
                ? "unidad"
                : "unidades"}
            </span>
          </div>
          <div className={styles.lines}>
            {lines.length === 0 ? (
              <p className={styles.emptyLines}>No hay productos asignados a este pago.</p>
            ) : null}
            {lines.map((line) => (
              <LineItemRow
                key={line.id}
                name={line.name}
                quantity={line.quantity}
                unitPriceCents={line.unitPriceCents}
                totalCents={line.totalCents}
                pourSizeMl={line.pourSizeMl}
                isAdjustment={line.isAdjustment}
              />
            ))}
          </div>
        </section>

        <section className={styles.checkoutPane} aria-label="Resumen y método de pago">
          <div className={styles.balanceHero} aria-live="polite">
            <span>Saldo pendiente</span>
            <strong data-numeric="true">
              <PriceTag cents={remainingBalanceCents} />
            </strong>
          </div>
          <div className={styles.totals}>
            <div className={styles.totalRow}>
              <span>Subtotal</span>
              <PriceTag cents={subtotalCents} />
            </div>
            <div className={styles.totalRow}>
              <span>Impuestos</span>
              <PriceTag cents={taxCents} />
            </div>
            <div className={`${styles.totalRow} ${styles.orderTotal}`}>
              <span>Total de la orden</span>
              <PriceTag cents={totalCents} />
            </div>
          </div>

          <div className={styles.amountBlock}>
            <div className={styles.currencyInput}>
              <span aria-hidden="true">$</span>
              <Input
                label="Monto a cobrar"
                type="number"
                inputMode="decimal"
                min={0.01}
                value={formatCentsToDollarsInput(amountToPayCents)}
                onChange={(value) => onAmountToPayChange(parseDollarsToCents(value))}
                error={amountError ?? undefined}
              />
            </div>
            {amountToPayCents < remainingBalanceCents ? (
              <p className={styles.afterPayment}>
                Después de este pago quedarán{" "}
                <strong data-numeric="true">${(postPaymentBalance / 100).toFixed(2)}</strong>{" "}
                pendientes.
              </p>
            ) : null}
          </div>

          <fieldset className={styles.methodFieldset}>
            <legend>Método de pago</legend>
            <div className={styles.methods}>
              {methods.map((method) => {
                const selected = method.code === selectedMethodCode;
                return (
                  <label
                    key={method.code}
                    className={selected ? styles.methodOptionSelected : styles.methodOption}
                  >
                    <input
                      aria-label={method.label}
                      type="radio"
                      name="payment-method"
                      checked={selected}
                      onChange={() => onSelectMethod(method.code)}
                    />
                    <Icon
                      name={
                        method.requiresTendered ? "cash" : /qr/i.test(method.label) ? "qr" : "bank"
                      }
                      size={20}
                    />
                    <span>
                      <strong>{method.label}</strong>
                    </span>
                    {selected ? <Icon name="check" size={18} /> : null}
                  </label>
                );
              })}
            </div>
            {selectedMethod ? (
              <p className={styles.methodHelp}>{methodHint(selectedMethod)}</p>
            ) : null}
          </fieldset>

          {requiresManualConfirmation ? (
            <label className={styles.confirmation}>
              <input
                type="checkbox"
                checked={manualConfirmation}
                onChange={(event) => setManualConfirmation(event.target.checked)}
              />
              <span>
                {/qr/i.test(selectedMethod?.label ?? "")
                  ? "Confirmo que el pago QR fue recibido."
                  : "Confirmo que la transferencia fue recibida."}
              </span>
            </label>
          ) : null}

          {showTenderedInput ? (
            <div className={styles.cashFields}>
              <Input
                label="Efectivo recibido"
                type="number"
                inputMode="decimal"
                min={0}
                value={formatCentsToDollarsInput(tenderedCents)}
                onChange={(value) => onTenderedChange(parseDollarsToCents(value))}
                error={tenderedError ?? undefined}
              />
              <div className={styles.quickCash} aria-label="Atajos de efectivo">
                {cashShortcuts(amountToPayCents).map((value, index) => (
                  <button type="button" key={value} onClick={() => onTenderedChange(value)}>
                    {index === 0 ? "Exacto · " : ""}${(value / 100).toFixed(2)}
                  </button>
                ))}
              </div>
              <div className={styles.change} aria-live="polite">
                <span>
                  {changeDueCents === null
                    ? "Cambio"
                    : changeDueCents === 0
                      ? "Sin cambio"
                      : "Cambio"}
                </span>
                <strong data-numeric="true">
                  {changeDueCents === null ? "—" : `$${(changeDueCents / 100).toFixed(2)}`}
                </strong>
              </div>
            </div>
          ) : null}

          {errorMessage ? (
            <p role="alert" className={styles.error}>
              {errorMessage}
            </p>
          ) : null}
          {!canConfirm && blockingMessage ? (
            <p className={styles.blockingMessage} role="status">
              {blockingMessage}
            </p>
          ) : null}
          <Button
            onClick={onConfirmPayment}
            disabled={
              !canConfirm || (requiresManualConfirmation && !manualConfirmation) || isProcessing
            }
          >
            {isProcessing
              ? "Procesando pago…"
              : `${amountToPayCents < remainingBalanceCents || requiresManualConfirmation ? "Registrar pago" : "Cobrar"} · $${(amountToPayCents / 100).toFixed(2)}`}
          </Button>
        </section>
      </div>
    </section>
  );
}
