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

const dateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });

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
          <p className={styles.eyebrow}>Collections</p>
          <h2>Pending Debts</h2>
          <p>Collect balances without reopening original tables. Start with identified customers, then resolve free-name accounts.</p>
        </div>
      </header>

      {message ? <div role="status" aria-live="polite" className={styles.message}>{message}</div> : null}

      <section aria-label="Collection summary" className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <span>Total Pending</span>
          <strong><PriceTag cents={totalPendingCents} /></strong>
          <p>{customerDebts.length + unlinkedAccounts.length} open debt record(s)</p>
        </article>
        <article className={styles.summaryCard}>
          <span>Identified Customers</span>
          <strong><PriceTag cents={identifiedTotalCents} /></strong>
          <p>{customerDebts.length} ready to collect</p>
        </article>
        <article className={styles.summaryCard}>
          <span>Free-Name Accounts</span>
          <strong><PriceTag cents={unlinkedTotalCents} /></strong>
          <p>{unlinkedAccounts.length} need payment or customer linking</p>
        </article>
      </section>

      <div className={styles.debtWorkspace}>
        <section aria-label="Identified customer debts" className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.stepLabel}>Collect First</p>
              <h3>Identified Customers</h3>
              <p>These balances already belong to a customer ledger.</p>
            </div>
            <PriceTag cents={identifiedTotalCents} />
          </div>
          {customerDebts.length === 0 ? <p className={styles.emptyState}>No identified customer debt.</p> : null}
          <div className={styles.rows}>
            {customerDebts.map((debt) => (
              <article key={debt.customerId} aria-label={`Debt for ${debt.displayName}`} className={styles.row}>
                <div className={styles.rowIdentity}>
                  <strong>{debt.displayName}</strong>
                  <span>Last activity {formatDate(debt.lastDebtAt)}</span>
                </div>
                <div className={styles.balanceBlock}>
                  <span>Balance</span>
                  <strong><PriceTag cents={debt.balanceCents} /></strong>
                </div>
                <div className={styles.paymentAction}>
                  <Input
                    label={`Payment amount for ${debt.displayName}`}
                    type="number"
                    value={customerPaymentDrafts[debt.customerId] ?? ""}
                    onChange={(amount) => onCustomerPaymentDraftChange(debt.customerId, amount)}
                    placeholder="500"
                  />
                  <Button onClick={() => onPayCustomerDebt(debt.customerId)} disabled={disabled || Number(customerPaymentDrafts[debt.customerId] ?? 0) <= 0}>
                    Record customer payment
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-label="Unlinked free-name pending accounts" className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.stepLabel}>Resolve Identity</p>
              <h3>Free-Name Accounts</h3>
              <p>Collect directly or link the account to a real customer.</p>
            </div>
            <PriceTag cents={unlinkedTotalCents} />
          </div>
          {unlinkedAccounts.length === 0 ? <p className={styles.emptyState}>No unlinked free-name pending accounts.</p> : null}
          <div className={styles.rows}>
            {unlinkedAccounts.map((account) => (
              <article key={account.accountId} aria-label={`Pending account for ${account.freeName}`} className={styles.row}>
                <div className={styles.rowIdentity}>
                  <strong>{account.freeName}</strong>
                  <span>Order {account.orderId} · table {account.tableId}</span>
                  <small>Created {formatDate(account.createdAt)}</small>
                </div>
                <div className={styles.balanceBlock}>
                  <span>Remaining</span>
                  <strong><PriceTag cents={account.remainingCents} /></strong>
                </div>
                <div className={styles.paymentAction}>
                  <Input
                    label={`Payment amount for ${account.freeName}`}
                    type="number"
                    value={accountPaymentDrafts[account.accountId] ?? ""}
                    onChange={(amount) => onAccountPaymentDraftChange(account.accountId, amount)}
                    placeholder="500"
                  />
                  <ButtonRow>
                    <Button onClick={() => onPayUnlinkedAccount(account.accountId)} disabled={disabled || Number(accountPaymentDrafts[account.accountId] ?? 0) <= 0}>
                      Record account payment
                    </Button>
                  </ButtonRow>
                </div>
                <div className={styles.linkBox}>
                  <label className={styles.field}>
                    Link to existing customer
                    <select
                      value={linkCustomerDrafts[account.accountId] ?? ""}
                      onChange={(event) => onLinkCustomerDraftChange(account.accountId, event.target.value)}
                      disabled={disabled || customers.length === 0}
                    >
                      <option value="">Select customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>{customer.displayName}</option>
                      ))}
                    </select>
                  </label>
                  <Button variant="secondary" onClick={() => onLinkToCustomer(account.accountId)} disabled={disabled || !(linkCustomerDrafts[account.accountId] ?? "")}>
                    Link account
                  </Button>
                  <Button variant="secondary" onClick={() => onCreateCustomerFromAccount(account.accountId)} disabled={disabled}>
                    Create customer from free name
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
