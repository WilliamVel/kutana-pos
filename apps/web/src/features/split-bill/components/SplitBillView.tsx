import type {
  Customer,
  PersonalAccountOwner,
  PersonalAccountStatus,
} from "@kutana/shared/billing/model/personal-account.js";
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
  readonly onAssignQuantity: (draft?: AccountAllocationDraft) => void;
  readonly onPayAccount: (accountId: string) => void;
  readonly onMarkPending: (accountId: string) => void;
  readonly onDeleteAccount: (accountId: string) => void;
  readonly onAttemptClose: () => void;
}

function SectionHeader({
  label,
  title,
  description,
}: {
  readonly label: string;
  readonly title: string;
  readonly description: string;
}): JSX.Element {
  return (
    <div className={styles.sectionHeader}>
      <p className={styles.stepLabel}>{label}</p>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
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
  onDeleteAccount,
  onAttemptClose,
}: SplitBillViewProps): JSX.Element {
  const selectedAccount =
    accounts.find((account) => account.id === allocationDraft.accountId) ?? null;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Account assignment</p>
          <h2>{tableLabel} — Personal accounts</h2>
          <p className={styles.headerCopy}>
            Create named accounts, assign item quantities, then settle or mark each balance pending.
          </p>
        </div>
        <Button variant="secondary" onClick={onAttemptClose} disabled={disabled}>
          Review table closure
        </Button>
      </header>

      {reviewMessage ? (
        <div role="alert" className={styles.review}>
          {reviewMessage}
        </div>
      ) : null}

      <section aria-label="Account Setup" className={styles.card}>
        <SectionHeader
          label="Step 1"
          title="Account Setup"
          description="Choose who gets their own account before assigning items."
        />
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
                <option key={customer.id} value={customer.id}>
                  {customer.displayName}
                </option>
              ))}
            </select>
          </label>
          <Button
            onClick={onCreateCustomerAccount}
            disabled={disabled || selectedCustomerId.length === 0}
          >
            Create customer account
          </Button>
          <Input
            label="Free-name account"
            value={freeName}
            onChange={onFreeNameChange}
            placeholder="Juan P."
          />
          <Button
            variant="secondary"
            onClick={onCreateFreeNameAccount}
            disabled={disabled || freeName.trim().length === 0}
          >
            Create free-name account
          </Button>
        </div>
      </section>

      <section aria-label="Assign Items" className={styles.card}>
        <SectionHeader
          label="Step 2"
          title="Assign Items"
          description="Choose one account, then add pending items from the left panel."
        />
        <div className={styles.assignmentWorkspace}>
          <section aria-label="Pending Items" className={styles.assignmentList}>
            {lines.map((line) => {
              const quantity =
                allocationDraft.lineItemId === line.id ? allocationDraft.quantity : "1";
              return (
                <article
                  key={line.id}
                  className={styles.assignmentItem}
                  aria-label={`Assign ${line.name}`}
                >
                  <div className={styles.assignmentSummary}>
                    <span className={styles.itemName}>
                      <strong>{line.name}</strong> × {line.quantity}
                    </span>
                    <span
                      className={
                        line.unassignedQuantity > 0 ? styles.unassignedBadge : styles.assignedBadge
                      }
                    >
                      {line.unassignedQuantity} unassigned
                    </span>
                    <PriceTag cents={line.totalCents} />
                  </div>
                  <div className={styles.quickAssignControls}>
                    <Input
                      label={`Quantity for ${line.name}`}
                      type="number"
                      value={quantity}
                      onChange={(nextQuantity) =>
                        onAllocationDraftChange({
                          ...allocationDraft,
                          lineItemId: line.id,
                          quantity: nextQuantity,
                        })
                      }
                    />
                    <Button
                      onClick={() =>
                        onAssignQuantity({ ...allocationDraft, lineItemId: line.id, quantity })
                      }
                      disabled={
                        disabled ||
                        !allocationDraft.accountId ||
                        line.unassignedQuantity === 0 ||
                        Number(quantity) <= 0
                      }
                    >
                      Add {line.name} to selected account
                    </Button>
                  </div>
                </article>
              );
            })}
          </section>
          <section aria-label="Selected Account" className={styles.selectedAccountPanel}>
            <h4>Selected Account</h4>
            <p>Choose the account receiving items.</p>
            <div className={styles.accountPicker}>
              {accounts.length === 0 ? (
                <span className={styles.emptyState}>Create an account first.</span>
              ) : null}
              {accounts.map((account) => {
                const isSelected = account.id === allocationDraft.accountId;
                return (
                  <button
                    key={account.id}
                    type="button"
                    className={isSelected ? styles.selectedAccountButton : styles.accountButton}
                    onClick={() =>
                      onAllocationDraftChange({
                        ...allocationDraft,
                        accountId: isSelected ? "" : account.id,
                      })
                    }
                    disabled={disabled}
                    aria-label={`${isSelected ? "Clear selected account" : "Select account"} ${account.ownerLabel}`}
                    aria-pressed={isSelected}
                  >
                    <span>Select account {account.ownerLabel}</span>
                    <strong>{account.ownerLabel}</strong>
                    <small>{account.status.replace("_", " ")}</small>
                  </button>
                );
              })}
            </div>
            {selectedAccount ? (
              <dl className={styles.balanceGrid}>
                <div>
                  <dt>Total</dt>
                  <dd>
                    <PriceTag cents={selectedAccount.totalCents} />
                  </dd>
                </div>
                <div>
                  <dt>Paid</dt>
                  <dd>
                    <PriceTag cents={selectedAccount.paidCents} />
                  </dd>
                </div>
                <div>
                  <dt>Remaining</dt>
                  <dd>
                    <PriceTag cents={selectedAccount.remainingCents} />
                  </dd>
                </div>
              </dl>
            ) : null}
          </section>
        </div>
      </section>

      <section aria-label="Account Balances" className={styles.card}>
        <SectionHeader
          label="Step 3"
          title="Account Balances"
          description="Review each account total, paid amount, and remaining balance."
        />
        {accounts.length === 0 ? (
          <p className={styles.emptyState}>No personal accounts yet.</p>
        ) : null}
        <div className={styles.accounts}>
          {accounts.map((account) => (
            <article
              key={account.id}
              className={styles.account}
              aria-label={`Account balance for ${account.ownerLabel}`}
            >
              <div className={styles.accountIdentity}>
                <strong>{account.ownerLabel}</strong>
                <span>{account.status.replace("_", " ")}</span>
              </div>
              <dl className={styles.balanceGrid}>
                <div>
                  <dt>Total</dt>
                  <dd>
                    <PriceTag cents={account.totalCents} />
                  </dd>
                </div>
                <div>
                  <dt>Paid</dt>
                  <dd>
                    <PriceTag cents={account.paidCents} />
                  </dd>
                </div>
                <div>
                  <dt>Remaining</dt>
                  <dd>
                    <PriceTag cents={account.remainingCents} />
                  </dd>
                </div>
              </dl>
              <ButtonRow>
                <Button
                  onClick={() => onPayAccount(account.id)}
                  disabled={
                    disabled || account.remainingCents === 0 || account.status === "pending"
                  }
                >
                  Pay now
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => onMarkPending(account.id)}
                  disabled={
                    disabled || account.remainingCents === 0 || account.status === "pending"
                  }
                >
                  Mark pending
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => onDeleteAccount(account.id)}
                  disabled={
                    disabled ||
                    account.paidCents > 0 ||
                    account.status === "pending" ||
                    account.status === "paid"
                  }
                >
                  Delete account
                </Button>
              </ButtonRow>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
