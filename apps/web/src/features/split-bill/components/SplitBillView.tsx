import type {
  Customer,
  PersonalAccountOwner,
  PersonalAccountStatus,
} from "@kutana/shared/billing/model/personal-account.js";
import { Button } from "../../../design-system/atoms/Button.js";
import { Icon } from "../../../design-system/atoms/Icon.js";
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

function formatAccountStatus(status: PersonalAccountStatus): string {
  const labels: Record<PersonalAccountStatus, string> = {
    open: "Abierta",
    partially_paid: "Parcialmente pagada",
    pending: "Pendiente",
    paid: "Pagada",
    void: "Anulada",
  };

  return labels[status];
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
          <p className={styles.eyebrow}>Asignación de cuentas</p>
          <h2>{tableLabel} — Cuentas personales</h2>
          <p className={styles.headerCopy}>
            Creá cuentas por persona, asigná cantidades y después cobrá o dejá saldos pendientes.
          </p>
        </div>
        <Button variant="secondary" onClick={onAttemptClose} disabled={disabled}>
          Revisar cierre de mesa
        </Button>
      </header>

      {reviewMessage ? (
        <div role="alert" className={styles.review}>
          {reviewMessage}
        </div>
      ) : null}

      <section aria-label="Configuración de cuentas" className={styles.card}>
        <SectionHeader
          label="Paso 1"
          title="Configuración de cuentas"
          description="Elegí quién necesita una cuenta propia antes de asignar productos."
        />
        <div className={styles.formGrid}>
          <div className={styles.pathGroup}>
            <label className={styles.field}>
              Cliente existente
              <select
                value={selectedCustomerId}
                onChange={(event) => onSelectCustomer(event.target.value)}
                disabled={disabled || customers.length === 0}
              >
                <option value="">Seleccionar cliente</option>
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
              Crear cuenta de cliente
            </Button>
          </div>
          <div className={styles.pathGroup}>
            <Input
              label="Cuenta con nombre libre"
              value={freeName}
              onChange={onFreeNameChange}
              placeholder="Juan P."
            />
            <Button
              variant="secondary"
              onClick={onCreateFreeNameAccount}
              disabled={disabled || freeName.trim().length === 0}
            >
              Crear cuenta libre
            </Button>
          </div>
        </div>
      </section>

      <section aria-label="Asignar productos" className={styles.card}>
        <SectionHeader
          label="Paso 2"
          title="Asignar productos"
          description="Elegí una cuenta y sumale los productos pendientes desde la lista."
        />
        {lines.length === 0 ? (
          <div role="alert" className={styles.review}>
            Para dividir la cuenta o cobrar debe existir al menos un producto para pagar.
          </div>
        ) : null}
        <div className={styles.assignmentWorkspace}>
          <section aria-label="Productos pendientes" className={styles.assignmentList}>
            {lines.map((line) => {
              const quantity =
                allocationDraft.lineItemId === line.id ? allocationDraft.quantity : "1";
              return (
                <article
                  key={line.id}
                  className={styles.assignmentItem}
                  aria-label={`Asignar ${line.name}`}
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
                      {line.unassignedQuantity} sin asignar
                    </span>
                    <PriceTag cents={line.totalCents} />
                  </div>
                  <div className={styles.quickAssignControls}>
                    <Input
                      label={`Cantidad para ${line.name}`}
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
                      Agregar
                    </Button>
                  </div>
                </article>
              );
            })}
          </section>
          <section aria-label="Cuenta seleccionada" className={styles.selectedAccountPanel}>
            <h4>Cuenta seleccionada</h4>
            <p>Elegí la cuenta que va a recibir los productos.</p>
            <div className={styles.accountPicker}>
              {accounts.length === 0 ? (
                <span className={styles.emptyState}>Primero creá una cuenta.</span>
              ) : null}
              {accounts.map((account) => {
                const isSelected = account.id === allocationDraft.accountId;
                return (
                  <article key={account.id} className={styles.accountPickerItem}>
                    <button
                      type="button"
                      className={isSelected ? styles.selectedAccountButton : styles.accountButton}
                      onClick={() =>
                        onAllocationDraftChange({
                          ...allocationDraft,
                          accountId: isSelected ? "" : account.id,
                        })
                      }
                      disabled={disabled}
                      aria-label={`${isSelected ? "Quitar cuenta seleccionada" : "Seleccionar cuenta"} ${account.ownerLabel}`}
                      aria-pressed={isSelected}
                    >
                      <span>{isSelected ? "Cuenta seleccionada" : "Seleccionar cuenta"}</span>
                      <strong>{account.ownerLabel}</strong>
                      <small>{formatAccountStatus(account.status)}</small>
                    </button>
                    <button
                      type="button"
                      className={styles.removeAccountButton}
                      aria-label={`Quitar ${account.ownerLabel} de esta división`}
                      title="Quitar de esta división"
                      onClick={() => onDeleteAccount(account.id)}
                      disabled={
                        disabled ||
                        account.paidCents > 0 ||
                        account.status === "pending" ||
                        account.status === "paid"
                      }
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </article>
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
                  <dt>Pagado</dt>
                  <dd>
                    <PriceTag cents={selectedAccount.paidCents} />
                  </dd>
                </div>
                <div>
                  <dt>Restante</dt>
                  <dd>
                    <PriceTag cents={selectedAccount.remainingCents} />
                  </dd>
                </div>
              </dl>
            ) : null}
          </section>
        </div>
      </section>

      <section aria-label="Saldos de cuentas" className={styles.card}>
        <SectionHeader
          label="Paso 3"
          title="Saldos de cuentas"
          description="Revisá el total, lo pagado y el saldo restante de cada cuenta."
        />
        {accounts.length === 0 ? (
          <p className={styles.emptyState}>Todavía no hay cuentas personales.</p>
        ) : null}
        <div className={styles.accounts}>
          {accounts.map((account) => (
            <article
              key={account.id}
              className={styles.account}
              aria-label={`Saldo de cuenta de ${account.ownerLabel}`}
            >
              <div className={styles.accountIdentity}>
                <strong>{account.ownerLabel}</strong>
                <span>{formatAccountStatus(account.status)}</span>
              </div>
              <dl className={styles.balanceGrid}>
                <div>
                  <dt>Total</dt>
                  <dd>
                    <PriceTag cents={account.totalCents} />
                  </dd>
                </div>
                <div>
                  <dt>Pagado</dt>
                  <dd>
                    <PriceTag cents={account.paidCents} />
                  </dd>
                </div>
                <div>
                  <dt>Restante</dt>
                  <dd>
                    <PriceTag cents={account.remainingCents} />
                  </dd>
                </div>
              </dl>
              <div className={styles.accountActions}>
                <ButtonRow className={styles.accountActionsRow}>
                  <Button
                    onClick={() => onPayAccount(account.id)}
                    disabled={
                      disabled || account.remainingCents === 0 || account.status === "pending"
                    }
                  >
                    Cobrar
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => onMarkPending(account.id)}
                    disabled={
                      disabled || account.remainingCents === 0 || account.status === "pending"
                    }
                  >
                    Dejar pendiente
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
                    Eliminar
                  </Button>
                </ButtonRow>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
