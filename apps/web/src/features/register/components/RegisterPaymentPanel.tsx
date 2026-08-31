import type { PourSize } from "@kutana/shared/catalog/model/product.js";
import { Button } from "../../../design-system/atoms/Button.js";
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

/**
 * Deliberately not `PaymentMethodCode` (the branded string type) — this is
 * a plain string prop boundary so the component stays a pure presentational
 * leaf with no dependency on how the container branded the value.
 */
export interface RegisterPaymentMethodOption {
  readonly code: string;
  readonly label: string;
  readonly requiresTendered: boolean;
}

export interface RegisterPaymentPanelProps {
  readonly lines: readonly RegisterPaymentPanelLine[];
  /** Integer cents. */
  readonly subtotalCents: number;
  /** Integer cents. */
  readonly taxCents: number;
  /** Integer cents. */
  readonly totalCents: number;
  /** Integer cents — what remains unpaid on this payable unit, after any prior partial payments. */
  readonly remainingBalanceCents: number;
  /**
   * Integer cents — the amount the cashier is applying THIS payment.
   * Defaults to `remainingBalanceCents` (paying it off in full) but is
   * editable so multiple partial payments can accumulate against the
   * current compatibility payment target.
   */
  readonly amountToPayCents: number;
  readonly onAmountToPayChange: (cents: number) => void;
  /**
   * Every method comes from `PaymentMethodRegistry` — the container reads
   * this list from `usePaymentMethods()`. This component never hardcodes a
   * method list, so it renders exactly whatever the registry contains
   * (KUTANA v1: CASH, BANK_TRANSFER, QR_PAYMENT — no cards).
   */
  readonly methods: readonly RegisterPaymentMethodOption[];
  readonly selectedMethodCode: string;
  readonly onSelectMethod: (code: string) => void;
  /** Integer cents, or null until the cashier enters an amount. */
  readonly tenderedCents: number | null;
  readonly onTenderedChange: (cents: number) => void;
  /** Integer cents, or null until a tendered amount covering the balance is entered. */
  readonly changeDueCents: number | null;
  readonly onConfirmPayment: () => void;
  readonly canConfirm: boolean;
}

function parseDollarsToCents(input: string): number {
  const [dollarsPart = "0", centsPart = "0"] = input.split(".");
  const dollars = Number.parseInt(dollarsPart, 10) || 0;
  const cents = Number.parseInt(centsPart.padEnd(2, "0").slice(0, 2), 10) || 0;
  return dollars * 100 + cents;
}

function formatCentsToDollarsInput(cents: number | null): string {
  if (cents === null) return "";
  const dollars = Math.trunc(cents / 100);
  const remainder = Math.abs(cents % 100);
  return `${dollars}.${remainder < 10 ? "0" : ""}${remainder}`;
}

/**
 * Purely presentational: props in, markup out, no port access. Method
 * selection is driven entirely by `methods` (the registry, injected by the
 * container via `usePaymentMethods()`) — never a hardcoded list — and the
 * tendered/change UI is shown only when the SELECTED method's own
 * `requiresTendered` flag says so.
 */
export function RegisterPaymentPanel({
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
}: RegisterPaymentPanelProps): JSX.Element {
  const selectedMethod = methods.find((method) => method.code === selectedMethodCode);
  const showTenderedInput = selectedMethod?.requiresTendered ?? false;

  return (
    <section className={styles.panel} aria-label="Register payment">
      <div className={styles.lines}>
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

      <div className={styles.totals}>
        <div className={styles.totalRow}>
          <span>Subtotal</span>
          <PriceTag cents={subtotalCents} />
        </div>
        <div className={styles.totalRow}>
          <span>Tax</span>
          <PriceTag cents={taxCents} />
        </div>
        <div className={styles.totalRow}>
          <span>Total</span>
          <PriceTag cents={totalCents} />
        </div>
        <div className={`${styles.totalRow} ${styles.remaining}`}>
          <span>Remaining balance</span>
          <PriceTag cents={remainingBalanceCents} />
        </div>
      </div>

      <Input
        label="Amount to pay now"
        type="number"
        value={formatCentsToDollarsInput(amountToPayCents)}
        onChange={(value) => onAmountToPayChange(parseDollarsToCents(value))}
      />

      <fieldset>
        <legend>Payment method</legend>
        <div className={styles.methods}>
          {methods.map((method) => (
            <label key={method.code} className={styles.methodOption}>
              <input
                type="radio"
                name="payment-method"
                checked={method.code === selectedMethodCode}
                onChange={() => onSelectMethod(method.code)}
              />
              {method.label}
            </label>
          ))}
        </div>
      </fieldset>

      {showTenderedInput ? (
        <Input
          label="Amount tendered"
          type="number"
          value={formatCentsToDollarsInput(tenderedCents)}
          onChange={(value) => onTenderedChange(parseDollarsToCents(value))}
        />
      ) : null}

      {changeDueCents !== null ? (
        <div className={styles.change}>
          <span>Change due</span>
          <PriceTag cents={changeDueCents} />
        </div>
      ) : null}

      <Button onClick={onConfirmPayment} disabled={!canConfirm}>
        Confirm payment
      </Button>
    </section>
  );
}
