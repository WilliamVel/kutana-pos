import type { Customer, PersonalAccountOwner, PersonalAccountStatus } from "@kutana/shared/billing/model/personal-account.js";
import { Button } from "../../../design-system/atoms/Button.js";
import { Input } from "../../../design-system/atoms/Input.js";
import { ButtonRow } from "../../../design-system/molecules/ButtonRow.js";
import { PriceTag } from "../../../design-system/molecules/PriceTag.js";
import styles from "./SplitBillView.module.css";

export interface AccountAssignmentLine {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly totalCents: number;
  readonly unassignedQuantity: number;
}

export interface AccountAssignmentAccount {
  readonly id: string;
  readonly ownerLabel: string;
  readonly owner: PersonalAccountOwner;
  readonly status: PersonalAccountStatus;
  readonly totalCents: number;
  readonly paidCents: number;
  readonly remainingCents: number;
}

export interface AccountAllocationDraft {
  readonly accountId: string;
  readonly lineItemId: string;
  readonly quantity: string;
}

export interface SplitBillViewProps {
  readonly tableLabel: string;
  readonly customers: readonly Customer[];
  readonly selectedCustomerId: string;
  readonly freeName: string;
  readonly lines: readonly AccountAssignmentLine[];
  readonly accounts: readonly AccountAssignmentAccount[];
  readonly allocationDraft: AccountAllocationDraft;
  readonly reviewMessage: string | null;
  readonly disabled?: boolean;
  readonly onSelectCustomer: (customerId: string) => void;
  readonly onFreeNameChange: (freeName: string) => void;
  readonly onCreateCustomerAccount: () => void;
  readonly onCreateFreeNameAccount: () => void;
  readonly onAllocationDraftChange: (draft: AccountAllocationDraft) => void;
  readonly onAssignQuantity: () => void;
  readonly onPayAccount: (accountId: string) => void;
  readonly onMarkPending: (accountId: string) => void;
  readonly onAttemptClose: () => void;
}

export function SplitBillView({
  tableLabel,
  customers,
  selectedCustomerId,
  freeName,
  lines,
  accounts,
  allocationDraft,
  reviewMessage,
  disabled = false,
  onSelectCustomer,
  onFreeNameChange,
  onCreateCustomerAccount,
  onCreateFreeNameAccount,
  onAllocationDraftChange,
  onAssignQuantity,
  onPayAccount,
  onMarkPending,
  onAttemptClose,
}: SplitBillViewProps): JSX.Element {
  const selectedLine = lines.find((line) => line.id === allocationDraft.lineItemId);
  const selectedLineUnassigned = selectedLine?.unassignedQuantity ?? 0;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Account assignment</p>
          <h2>{tableLabel} — Personal accounts</h2>
        </div>
        <Button variant="secondary" onClick={onAttemptClose} disabled={disabled}>
          Review table closure
        </Button>
      </header>

      {reviewMessage ? <div role="alert" className={styles.review}>{reviewMessage}</div> : null}

      <section aria-label="Create personal account" className={styles.card}>
        <h3>Create personal account</h3>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            Existing customer
            <select
              value={selectedCustomerId}
              onChange={(event) => onSelectCustomer(event.target.value)}
              disabled={disabled || customers.length === 0}
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.displayName}</option>
              ))}
            </select>
          </label>
          <Button onClick={onCreateCustomerAccount} disabled={disabled || selectedCustomerId.length === 0}>
            Create customer account
          </Button>
          <Input label="Free-name account" value={freeName} onChange={onFreeNameChange} placeholder="Juan P." />
          <Button variant="secondary" onClick={onCreateFreeNameAccount} disabled={disabled || freeName.trim().length === 0}>
            Create free-name account
          </Button>
        </div>
      </section>

      <section aria-label="Unassigned quantities" className={styles.card}>
        <h3>Unassigned quantities</h3>
        <div className={styles.lines}>
          {lines.map((line) => (
            <div key={line.id} className={styles.line}>
              <span><strong>{line.name}</strong> × {line.quantity}</span>
              <span>{line.unassignedQuantity} unassigned</span>
              <PriceTag cents={line.totalCents} />
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Assign quantity" className={styles.card}>
        <h3>Assign quantity to account</h3>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            Account
            <select
              value={allocationDraft.accountId}
              onChange={(event) => onAllocationDraftChange({ ...allocationDraft, accountId: event.target.value })}
              disabled={disabled || accounts.length === 0}
            >
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.ownerLabel}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Line item
            <select
              value={allocationDraft.lineItemId}
              onChange={(event) => onAllocationDraftChange({ ...allocationDraft, lineItemId: event.target.value })}
              disabled={disabled || lines.length === 0}
            >
              <option value="">Select line item</option>
              {lines.map((line) => (
                <option key={line.id} value={line.id}>{line.name} ({line.unassignedQuantity} unassigned)</option>
              ))}
            </select>
          </label>
          <Input label={`Quantity${selectedLine ? ` available: ${selectedLineUnassigned}` : ""}`} type="number" value={allocationDraft.quantity} onChange={(quantity) => onAllocationDraftChange({ ...allocationDraft, quantity })} />
          <Button onClick={onAssignQuantity} disabled={disabled || !allocationDraft.accountId || !allocationDraft.lineItemId || Number(allocationDraft.quantity) <= 0}>
            Assign quantity
          </Button>
        </div>
      </section>

      <section aria-label="Personal accounts" className={styles.card}>
        <h3>Personal accounts</h3>
        {accounts.length === 0 ? <p>No personal accounts yet.</p> : null}
        <div className={styles.accounts}>
          {accounts.map((account) => (
            <article key={account.id} className={styles.account} aria-label={`Account for ${account.ownerLabel}`}>
              <div>
                <strong>{account.ownerLabel}</strong>
                <p>{account.status.replace("_", " ")} · paid <PriceTag cents={account.paidCents} /> · remaining <PriceTag cents={account.remainingCents} /></p>
              </div>
              <PriceTag cents={account.totalCents} />
              <ButtonRow>
                <Button onClick={() => onPayAccount(account.id)} disabled={disabled || account.remainingCents === 0 || account.status === "pending"}>
                  Pay now
                </Button>
                <Button variant="secondary" onClick={() => onMarkPending(account.id)} disabled={disabled || account.remainingCents === 0 || account.status === "pending"}>
                  Mark pending
                </Button>
              </ButtonRow>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
