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
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Collections</p>
        <h2>Pending debts</h2>
        <p>Collect personal account balances without reopening their original tables.</p>
      </header>

      {message ? <div role="status" className={styles.message}>{message}</div> : null}

      <section aria-label="Identified customer debts" className={styles.card}>
        <h3>Identified customers</h3>
        {customerDebts.length === 0 ? <p>No identified customer debt.</p> : null}
        <div className={styles.rows}>
          {customerDebts.map((debt) => (
            <article key={debt.customerId} aria-label={`Debt for ${debt.displayName}`} className={styles.row}>
              <div>
                <strong>{debt.displayName}</strong>
                <p>Last activity {new Date(debt.lastDebtAt).toLocaleDateString()}</p>
              </div>
              <PriceTag cents={debt.balanceCents} />
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
            </article>
          ))}
        </div>
      </section>

      <section aria-label="Unlinked free-name pending accounts" className={styles.card}>
        <h3>Unlinked free-name accounts</h3>
        {unlinkedAccounts.length === 0 ? <p>No unlinked free-name pending accounts.</p> : null}
        <div className={styles.rows}>
          {unlinkedAccounts.map((account) => (
            <article key={account.accountId} aria-label={`Pending account for ${account.freeName}`} className={styles.row}>
              <div>
                <strong>{account.freeName}</strong>
                <p>Order {account.orderId} · table {account.tableId}</p>
              </div>
              <PriceTag cents={account.remainingCents} />
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
  );
}
