import type { Customer } from "@kutana/shared/billing/model/personal-account.js";
import { Button } from "../../../design-system/atoms/Button.js";
import { Input } from "../../../design-system/atoms/Input.js";
import { ButtonRow } from "../../../design-system/molecules/ButtonRow.js";
import { PriceTag } from "../../../design-system/molecules/PriceTag.js";
import styles from "./PendingDebtsView.module.css";

export interface PendingCustomerDebtRow {
  readonly customerId: string;
  readonly displayName: string;
  readonly balanceCents: number;
  readonly lastDebtAt: string;
}

export interface UnlinkedPendingAccountRow {
  readonly accountId: string;
  readonly freeName: string;
  readonly orderId: string;
  readonly tableId: string;
  readonly remainingCents: number;
  readonly createdAt: string;
}

export interface PendingDebtsViewProps {
  readonly customerDebts: readonly PendingCustomerDebtRow[];
  readonly unlinkedAccounts: readonly UnlinkedPendingAccountRow[];
  readonly customers: readonly Customer[];
  readonly customerPaymentDrafts: Readonly<Record<string, string>>;
  readonly accountPaymentDrafts: Readonly<Record<string, string>>;
  readonly linkCustomerDrafts: Readonly<Record<string, string>>;
  readonly disabled?: boolean;
  readonly message: string | null;
  readonly onCustomerPaymentDraftChange: (customerId: string, amount: string) => void;
  readonly onPayCustomerDebt: (customerId: string) => void;
  readonly onAccountPaymentDraftChange: (accountId: string, amount: string) => void;
  readonly onPayUnlinkedAccount: (accountId: string) => void;
  readonly onLinkCustomerDraftChange: (accountId: string, customerId: string) => void;
  readonly onLinkToCustomer: (accountId: string) => void;
  readonly onCreateCustomerFromAccount: (accountId: string) => void;
}

const dateFormatter = new Intl.DateTimeFormat("es", { month: "short", day: "numeric", year: "numeric" });

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

export function PendingDebtsView({
  customerDebts,
  unlinkedAccounts,
  customers,
  customerPaymentDrafts,
  accountPaymentDrafts,
  linkCustomerDrafts,
  disabled = false,
  message,
  onCustomerPaymentDraftChange,
  onPayCustomerDebt,
  onAccountPaymentDraftChange,
  onPayUnlinkedAccount,
  onLinkCustomerDraftChange,
  onLinkToCustomer,
  onCreateCustomerFromAccount,
}: PendingDebtsViewProps): JSX.Element {
  const identifiedTotalCents = customerDebts.reduce((sum, debt) => sum + debt.balanceCents, 0);
  const unlinkedTotalCents = unlinkedAccounts.reduce((sum, account) => sum + account.remainingCents, 0);
  const totalPendingCents = identifiedTotalCents + unlinkedTotalCents;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Cobros</p>
          <h2>Deudas pendientes</h2>
          <p>Cobrá saldos sin reabrir las mesas originales. Empezá por clientes identificados y después resolvé las cuentas con nombre libre.</p>
        </div>
      </header>

      {message ? <div role="status" aria-live="polite" className={styles.message}>{message}</div> : null}

      <section aria-label="Resumen de cobros" className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <span>Total pendiente</span>
          <strong><PriceTag cents={totalPendingCents} /></strong>
          <p>{customerDebts.length + unlinkedAccounts.length} registro(s) de deuda abiertos</p>
        </article>
        <article className={styles.summaryCard}>
          <span>Clientes identificados</span>
          <strong><PriceTag cents={identifiedTotalCents} /></strong>
          <p>{customerDebts.length} listo(s) para cobrar</p>
        </article>
        <article className={styles.summaryCard}>
          <span>Cuentas con nombre libre</span>
          <strong><PriceTag cents={unlinkedTotalCents} /></strong>
          <p>{unlinkedAccounts.length} necesitan cobro o vínculo con cliente</p>
        </article>
      </section>

      <div className={styles.debtWorkspace}>
        <section aria-label="Deudas de clientes identificados" className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.stepLabel}>Cobrar primero</p>
              <h3>Clientes identificados</h3>
              <p>Estos saldos ya pertenecen al historial de un cliente.</p>
            </div>
            <PriceTag cents={identifiedTotalCents} />
          </div>
          {customerDebts.length === 0 ? <p className={styles.emptyState}>No hay deudas de clientes identificados.</p> : null}
          <div className={styles.rows}>
            {customerDebts.map((debt) => (
              <article key={debt.customerId} aria-label={`Deuda de ${debt.displayName}`} className={styles.row}>
                <div className={styles.rowIdentity}>
                  <strong>{debt.displayName}</strong>
                  <span>Última actividad {formatDate(debt.lastDebtAt)}</span>
                </div>
                <div className={styles.balanceBlock}>
                  <span>Saldo</span>
                  <strong><PriceTag cents={debt.balanceCents} /></strong>
                </div>
                <div className={styles.paymentAction}>
                  <Input
                    label={`Monto de pago para ${debt.displayName}`}
                    type="number"
                    value={customerPaymentDrafts[debt.customerId] ?? ""}
                    onChange={(amount) => onCustomerPaymentDraftChange(debt.customerId, amount)}
                    placeholder="500"
                  />
                  <Button onClick={() => onPayCustomerDebt(debt.customerId)} disabled={disabled || Number(customerPaymentDrafts[debt.customerId] ?? 0) <= 0}>
                    Registrar pago
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-label="Cuentas pendientes sin cliente vinculado" className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.stepLabel}>Resolver identidad</p>
              <h3>Cuentas con nombre libre</h3>
              <p>Cobrá directamente o vinculá la cuenta con un cliente real.</p>
            </div>
            <PriceTag cents={unlinkedTotalCents} />
          </div>
          {unlinkedAccounts.length === 0 ? <p className={styles.emptyState}>No hay cuentas pendientes sin cliente vinculado.</p> : null}
          <div className={styles.rows}>
            {unlinkedAccounts.map((account) => (
              <article key={account.accountId} aria-label={`Cuenta pendiente de ${account.freeName}`} className={styles.row}>
                <div className={styles.rowIdentity}>
                  <strong>{account.freeName}</strong>
                  <span>Orden {account.orderId} · mesa {account.tableId}</span>
                  <small>Creada {formatDate(account.createdAt)}</small>
                </div>
                <div className={styles.balanceBlock}>
                  <span>Restante</span>
                  <strong><PriceTag cents={account.remainingCents} /></strong>
                </div>
                <div className={styles.paymentAction}>
                  <Input
                    label={`Monto de pago para ${account.freeName}`}
                    type="number"
                    value={accountPaymentDrafts[account.accountId] ?? ""}
                    onChange={(amount) => onAccountPaymentDraftChange(account.accountId, amount)}
                    placeholder="500"
                  />
                  <ButtonRow>
                    <Button onClick={() => onPayUnlinkedAccount(account.accountId)} disabled={disabled || Number(accountPaymentDrafts[account.accountId] ?? 0) <= 0}>
                      Registrar pago
                    </Button>
                  </ButtonRow>
                </div>
                <div className={styles.linkBox}>
                  <label className={styles.field}>
                    Vincular con cliente existente
                    <select
                      value={linkCustomerDrafts[account.accountId] ?? ""}
                      onChange={(event) => onLinkCustomerDraftChange(account.accountId, event.target.value)}
                      disabled={disabled || customers.length === 0}
                    >
                      <option value="">Seleccionar cliente</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>{customer.displayName}</option>
                      ))}
                    </select>
                  </label>
                  <Button variant="secondary" onClick={() => onLinkToCustomer(account.accountId)} disabled={disabled || !(linkCustomerDrafts[account.accountId] ?? "")}>
                    Vincular cuenta
                  </Button>
                  <Button variant="secondary" onClick={() => onCreateCustomerFromAccount(account.accountId)} disabled={disabled}>
                    Crear cliente desde nombre libre
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
