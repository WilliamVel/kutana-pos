import { useEffect, useMemo, useState } from "react";
import type {
  Customer,
  PersonalAccountOwner,
  PersonalAccountStatus,
} from "@kutana/shared/billing/model/personal-account.js";
import { largestRemainderSplit } from "@kutana/shared/money/largest-remainder.js";
import { Button } from "../../../design-system/atoms/Button.js";
import { Icon } from "../../../design-system/atoms/Icon.js";
import { Input } from "../../../design-system/atoms/Input.js";
import { PriceTag } from "../../../design-system/molecules/PriceTag.js";
import styles from "./SplitBillView.module.css";

export interface AccountAssignmentLine {
  readonly id: string;
  readonly lineItemIds: readonly string[];
  readonly name: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly totalCents: number;
  readonly unassignedQuantity: number;
}

export interface AssignedAccountLine {
  readonly allocationIds: readonly string[];
  readonly name: string;
  readonly quantity: number;
  readonly totalCents?: number;
}

export interface AccountPaymentDetail {
  readonly id: string;
  readonly amountCents: number;
  readonly methodLabel: string;
  readonly recordedAt: string;
}

export interface AccountAssignmentAccount {
  readonly id: string;
  readonly ownerLabel: string;
  readonly owner: PersonalAccountOwner;
  readonly status: PersonalAccountStatus;
  readonly totalCents: number;
  readonly paidCents: number;
  readonly remainingCents: number;
  readonly assignedLines?: readonly AssignedAccountLine[];
  readonly payments?: readonly AccountPaymentDetail[];
}

export interface AccountAllocationDraft {
  readonly accountId: string;
  readonly lineItemId: string;
  readonly quantity: string;
}

type SplitMethod = "person" | "equal" | "amount";

export interface SplitBillViewProps {
  readonly tableLabel: string;
  readonly tableTotalCents?: number;
  readonly tablePaidCents?: number;
  readonly tableRemainingCents?: number;
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
  readonly onAssignQuantities?: (drafts: readonly AccountAllocationDraft[]) => void;
  readonly onPayAccount: (accountId: string) => void;
  readonly onMarkPending: (accountId: string) => void;
  readonly onDeleteAccount: (accountId: string) => void;
  readonly onRemoveAllocation?: (accountId: string, allocationIds: readonly string[]) => void;
  readonly onAttemptClose: () => void;
  readonly onPayOrder?: () => void;
}

function formatStatus(status: PersonalAccountStatus): string {
  return ({ open: "Abierta", partially_paid: "Pago parcial", pending: "Pendiente", paid: "Pagado", void: "Anulada" })[status];
}

export function SplitBillView({
  tableLabel,
  tableTotalCents = 0,
  tablePaidCents = 0,
  tableRemainingCents = 0,
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
  onAssignQuantities,
  onPayAccount,
  onMarkPending,
  onDeleteAccount,
  onRemoveAllocation,
  onAttemptClose,
  onPayOrder,
}: SplitBillViewProps): JSX.Element {
  const [method, setMethod] = useState<SplitMethod | null>(accounts.length > 0 ? "person" : null);
  const [activeTab, setActiveTab] = useState<string>(accounts.length > 0 ? accounts[0]!.id : "unassigned");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsAccountId, setDetailsAccountId] = useState<string | null>(null);
  const [equalPeople, setEqualPeople] = useState(2);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(() => new Set());
  const [assignmentFeedback, setAssignmentFeedback] = useState<string | null>(null);
  const [reviewAccountId, setReviewAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (accounts.length > 0 && method === null) setMethod("person");
    if (activeTab !== "unassigned" && !accounts.some((account) => account.id === activeTab)) {
      setActiveTab("unassigned");
    }
    if (reviewAccountId && !accounts.some((account) => account.id === reviewAccountId)) {
      setReviewAccountId(null);
    }
  }, [accounts, activeTab, method, reviewAccountId]);

  useEffect(() => {
    if (allocationDraft.accountId && accounts.some((account) => account.id === allocationDraft.accountId)) {
      setActiveTab((current) => current === "unassigned" && accounts.length === 1 ? allocationDraft.accountId : current);
    }
  }, [accounts.length, allocationDraft.accountId]);

  useEffect(() => {
    setSelectedLineIds((current) => new Set([...current].filter((id) => lines.some((line) => line.id === id && line.unassignedQuantity > 0))));
  }, [lines]);

  const unassignedUnits = lines.reduce((sum, line) => sum + line.unassignedQuantity, 0);
  const assignedCents = accounts.reduce((sum, account) => sum + account.totalCents, 0);
  const unassignedCents = Math.max(0, tableTotalCents - assignedCents);
  const selectedAccount = accounts.find((account) => account.id === (reviewAccountId ?? activeTab)) ?? null;
  const destinationAccount = accounts.find((account) => account.id === allocationDraft.accountId) ?? null;
  const detailsAccount = accounts.find((account) => account.id === detailsAccountId) ?? null;
  const equalShares = useMemo(
    () => largestRemainderSplit(tableRemainingCents, Array.from({ length: equalPeople }, () => 1)),
    [equalPeople, tableRemainingCents],
  );
  const formatDate = (value: string): string =>
    new Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));

  const selectAccount = (accountId: string): void => {
    const account = accounts.find((candidate) => candidate.id === accountId);
    setActiveTab(accountId);
    setReviewAccountId(null);
    setSelectedLineIds(new Set());
    if (account && account.status !== "paid" && account.status !== "pending") {
      onAllocationDraftChange({ ...allocationDraft, accountId });
    }
  };

  const selectUnassigned = (): void => {
    setActiveTab("unassigned");
    setReviewAccountId(null);
    setSelectedLineIds(new Set());
    onAllocationDraftChange({ ...allocationDraft, accountId: "" });
  };

  const requestMethod = (nextMethod: SplitMethod): void => {
    if (nextMethod === method) return;
    const hasProtectedWork = assignedCents > 0 || accounts.some((account) => account.paidCents > 0 || account.status === "paid" || account.status === "pending");
    if (hasProtectedWork && !window.confirm("Ya hay productos asignados o pagos registrados. ¿Querés cambiar el método sin modificar esos datos?")) return;
    setMethod(nextMethod);
  };

  const updateQuantity = (lineId: string, next: number, maximum: number): void => {
    onAllocationDraftChange({
      ...allocationDraft,
      lineItemId: lineId,
      quantity: String(Math.max(1, Math.min(maximum, next))),
    });
  };

  const toggleLine = (lineId: string): void => {
    setSelectedLineIds((current) => {
      const next = new Set(current);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  };

  const selectedLines = lines.filter((line) => selectedLineIds.has(line.id) && line.unassignedQuantity > 0);
  const selectedTotalCents = selectedLines.reduce((sum, line) => sum + Math.round(line.totalCents / line.quantity), 0);
  const canAssignToDestination = destinationAccount && destinationAccount.status !== "paid" && destinationAccount.status !== "pending";
  const showAssignmentWorkspace = reviewAccountId === null && unassignedUnits > 0 && (activeTab === "unassigned" || Boolean(canAssignToDestination));

  const assignSelected = (): void => {
    if (!destinationAccount || selectedLines.length === 0) return;
    const drafts = selectedLines.map((line) => ({ accountId: destinationAccount.id, lineItemId: line.id, quantity: "1" }));
    if (onAssignQuantities) onAssignQuantities(drafts);
    else drafts.forEach((draft) => onAssignQuantity(draft));
    setSelectedLineIds(new Set());
    setAssignmentFeedback(`${drafts.length} producto(s) asignado(s) a ${destinationAccount.ownerLabel}`);
  };

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Dividir cuenta</p>
          <h2>{tableLabel} — Cuentas personales</h2>
        </div>
        <strong className={styles.heroTotal}><PriceTag cents={tableTotalCents} /></strong>
      </header>

      <dl className={styles.tableSummary} aria-label="Resumen de la mesa">
        <div><dt>Asignado</dt><dd><PriceTag cents={assignedCents} /></dd></div>
        <div><dt>Sin asignar</dt><dd><PriceTag cents={unassignedCents} /></dd></div>
        <div><dt>Pagado</dt><dd><PriceTag cents={tablePaidCents} /></dd></div>
        <div className={styles.tableRemaining}><dt>Saldo pendiente</dt><dd><PriceTag cents={tableRemainingCents} /></dd></div>
      </dl>

      {reviewMessage ? <div role="alert" className={styles.review}>{reviewMessage}</div> : null}

      {method === null ? (
        <section className={styles.methodChooser} aria-labelledby="split-method-title">
          <div>
            <p className={styles.eyebrow}>Cuenta de {tableLabel}</p>
            <h3 id="split-method-title">¿Cómo quieres dividir la cuenta?</h3>
          </div>
          <div className={styles.methodGrid}>
            <button type="button" onClick={() => setMethod("person")}>
              <Icon name="customers" size={24} /><strong>Por persona</strong><span>Asigná productos y cantidades a cada persona.</span>
            </button>
            <button type="button" onClick={() => setMethod("equal")}>
              <Icon name="split" size={24} /><strong>Partes iguales</strong><span>Calculá una parte exacta para cada comensal.</span>
            </button>
            <button type="button" onClick={() => setMethod("amount")}>
              <Icon name="cash" size={24} /><strong>Por monto</strong><span>Cobrá montos parciales hasta completar el saldo.</span>
            </button>
          </div>
        </section>
      ) : (
        <nav className={styles.modeBar} aria-label="Método de división">
          <button type="button" className={method === "person" ? styles.modeActive : ""} onClick={() => requestMethod("person")}>Por persona</button>
          <button type="button" className={method === "equal" ? styles.modeActive : ""} onClick={() => requestMethod("equal")}>Partes iguales</button>
          <button type="button" className={method === "amount" ? styles.modeActive : ""} onClick={() => requestMethod("amount")}>Por monto</button>
        </nav>
      )}

      {method === "person" ? (
        <section className={styles.personWorkspace} aria-label="División por persona">
          <div className={styles.accountTabs} role="tablist" aria-label="Cuentas de la mesa">
            <button type="button" role="tab" aria-selected={activeTab === "unassigned" && !destinationAccount} className={activeTab === "unassigned" && !destinationAccount ? styles.tabActive : styles.tab} onClick={selectUnassigned}>
              Sin asignar <span>{unassignedUnits}</span>
            </button>
            {accounts.map((account) => {
              const isDestination = destinationAccount?.id === account.id;
              const statusPrefix = account.status === "paid" ? "✓ " : account.status === "pending" ? "• " : "";
              return (
                <button key={account.id} type="button" role="tab" aria-selected={isDestination || activeTab === account.id} className={`${isDestination || activeTab === account.id ? styles.tabActive : styles.tab} ${account.status === "paid" ? styles.tabPaid : account.status === "pending" ? styles.tabPending : ""}`} onClick={() => selectAccount(account.id)} aria-label={`Seleccionar cuenta ${account.ownerLabel}`}>
                  {statusPrefix}{account.ownerLabel} <PriceTag cents={account.remainingCents} />
                </button>
              );
            })}
            <button type="button" className={styles.addTab} onClick={() => setCreateOpen(true)} aria-label="Agregar persona"><span aria-hidden="true">+</span><span className={styles.addTabLabel}>Nueva persona</span></button>
          </div>

          {showAssignmentWorkspace ? (
            <section aria-label="Productos pendientes" className={styles.productPanel}>
              <div className={styles.panelHeading}>
                <div><h3>Productos sin asignar</h3><p>{unassignedUnits} unidad(es) disponibles</p></div>
                <div className={styles.assignmentTarget}><span>Asignando a: <strong>{destinationAccount?.ownerLabel ?? "seleccioná una persona"}</strong></span>{destinationAccount ? <button type="button" onClick={() => setReviewAccountId(destinationAccount.id)}>Ver cuenta</button> : null}</div>
              </div>
              {assignmentFeedback ? <p className={styles.assignmentFeedback} role="status">✓ {assignmentFeedback}</p> : null}
              {lines.length === 0 ? <div role="alert" className={styles.emptyState}>Para dividir la cuenta debe existir al menos un producto.</div> : null}
              <div className={styles.productList}>
                {lines.filter((line) => line.unassignedQuantity > 0).map((line) => {
                  const quantity = allocationDraft.lineItemId === line.id ? Number(allocationDraft.quantity) || 1 : 1;
                  const isSelected = selectedLineIds.has(line.id);
                  return (
                    <article key={line.id} className={`${styles.productRow} ${isSelected ? styles.productRowSelected : ""}`} aria-label={`Asignar ${line.name}`}>
                      <label className={styles.productSelect}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleLine(line.id)} disabled={disabled || !canAssignToDestination} aria-label={`Seleccionar ${line.name}`} />
                        <span className={styles.productInfo}><strong>{line.name}</strong>{line.unassignedQuantity > 1 ? <small>{line.unassignedQuantity} disponibles</small> : null}</span>
                      </label>
                      <PriceTag cents={Math.round(line.totalCents / line.quantity) * quantity} />
                      {line.unassignedQuantity > 1 ? (
                        <div className={styles.quantityControl}>
                          <button type="button" onClick={() => updateQuantity(line.id, quantity - 1, line.unassignedQuantity)} aria-label={`Reducir ${line.name}`}>−</button>
                          <input type="number" min="1" max={line.unassignedQuantity} value={quantity} onChange={(event) => updateQuantity(line.id, Number(event.target.value), line.unassignedQuantity)} aria-label={`Cantidad para ${line.name}`} />
                          <button type="button" onClick={() => updateQuantity(line.id, quantity + 1, line.unassignedQuantity)} aria-label={`Aumentar ${line.name}`}>+</button>
                        </div>
                      ) : <span className={styles.singleQuantity} aria-hidden="true" />}
                      <Button ariaLabel="Agregar" onClick={() => { if (!destinationAccount) return; onAssignQuantity({ ...allocationDraft, accountId: destinationAccount.id, lineItemId: line.id, quantity: String(quantity) }); setAssignmentFeedback(`${line.name} asignado a ${destinationAccount.ownerLabel}`); }} disabled={disabled || !canAssignToDestination}>Asignar</Button>
                    </article>
                  );
                })}
              </div>
              {selectedLines.length > 0 && destinationAccount ? (
                <div className={styles.batchAction} role="region" aria-label="Asignación múltiple">
                  <span><strong>{selectedLines.length} seleccionado{selectedLines.length === 1 ? "" : "s"}</strong> · <PriceTag cents={selectedTotalCents} /></span>
                  <Button onClick={assignSelected} disabled={disabled}>Asignar a {destinationAccount.ownerLabel}</Button>
                </div>
              ) : null}
            </section>
          ) : unassignedUnits === 0 && activeTab === "unassigned" ? (
            <section className={styles.allAssigned} aria-label="Todos los productos asignados">
              <div><p className={styles.doneState}>✓ Todos los productos están asignados.</p><h3>Revisá las cuentas y completá el cobro</h3><p>Seleccioná una persona para cobrar, dejar pendiente o revisar su estado.</p></div>
              <Button onClick={onAttemptClose} disabled={disabled}>Revisar cierre de mesa</Button>
            </section>
          ) : selectedAccount ? (
            <article className={styles.accountDetail} aria-label={`Saldo de cuenta de ${selectedAccount.ownerLabel}`}>
              <div className={styles.accountTitle}><div><span className={styles.status}>{formatStatus(selectedAccount.status)}</span><h3>{selectedAccount.ownerLabel}</h3></div><PriceTag cents={selectedAccount.totalCents} /></div>
              <section aria-label={`Productos asignados a ${selectedAccount.ownerLabel}`} className={styles.assignedProducts}>
                {(selectedAccount.assignedLines?.length ?? 0) === 0 ? <p className={styles.emptyState}>Todavía no hay productos asignados.</p> : <ul>{selectedAccount.assignedLines?.map((line) => <li key={line.allocationIds.join("-")}><span><strong>{line.name}</strong><small>×{line.quantity}</small></span>{line.totalCents !== undefined ? <PriceTag cents={line.totalCents} /> : null}<button type="button" onClick={() => onRemoveAllocation?.(selectedAccount.id, line.allocationIds)} disabled={disabled || selectedAccount.paidCents > 0 || selectedAccount.status === "pending" || selectedAccount.status === "paid"} aria-label={`Quitar ${line.name} de la cuenta de ${selectedAccount.ownerLabel}`}>Devolver</button></li>)}</ul>}
              </section>
              <dl className={styles.accountBalances}><div><dt>Total</dt><dd><PriceTag cents={selectedAccount.totalCents} /></dd></div><div><dt>Pagado</dt><dd><PriceTag cents={selectedAccount.paidCents} /></dd></div><div><dt>Restante</dt><dd><PriceTag cents={selectedAccount.remainingCents} /></dd></div></dl>
              <div className={styles.accountActions}>
                <Button ariaLabel="Cobrar" onClick={() => onPayAccount(selectedAccount.id)} disabled={disabled || selectedAccount.remainingCents === 0 || selectedAccount.status === "pending"}>Cobrar <PriceTag cents={selectedAccount.remainingCents} /></Button>
                <Button variant="secondary" onClick={() => onMarkPending(selectedAccount.id)} disabled={disabled || selectedAccount.remainingCents === 0 || selectedAccount.status === "pending"}>Dejar pendiente</Button>
                {(selectedAccount.payments?.length ?? 0) > 0 ? <Button variant="secondary" onClick={() => setDetailsAccountId(selectedAccount.id)}>Ver pagos ({selectedAccount.payments?.length})</Button> : null}
                <Button variant="secondary" onClick={() => onDeleteAccount(selectedAccount.id)} disabled={disabled || selectedAccount.paidCents > 0 || selectedAccount.status === "pending" || selectedAccount.status === "paid"}>Eliminar</Button>
                <button type="button" className={styles.removeAccountLink} aria-label={`Quitar ${selectedAccount.ownerLabel} de esta división`} onClick={() => onDeleteAccount(selectedAccount.id)} disabled={disabled || selectedAccount.paidCents > 0 || selectedAccount.status === "pending" || selectedAccount.status === "paid"}>Quitar de esta división</button>
              </div>
            </article>
          ) : null}
        </section>
      ) : null}

      {method === "equal" ? (
        <section className={styles.simpleFlow} aria-label="División en partes iguales">
          <p>Saldo a dividir</p><h3><PriceTag cents={tableRemainingCents} /></h3>
          <label>Número de personas</label>
          <div className={styles.peopleStepper}><button type="button" onClick={() => setEqualPeople(Math.max(2, equalPeople - 1))}>−</button><strong>{equalPeople}</strong><button type="button" onClick={() => setEqualPeople(Math.min(20, equalPeople + 1))}>+</button></div>
          <div className={styles.equalResult}><span>Cada persona</span><strong><PriceTag cents={equalShares[0] ?? 0} /></strong>{new Set(equalShares).size > 1 ? <small>Una parte se ajusta 1 centavo para que el total sea exacto.</small> : null}</div>
          <Button onClick={() => onPayOrder?.()} disabled={disabled || !onPayOrder}>Comenzar cobro en {equalPeople} partes</Button>
        </section>
      ) : null}

      {method === "amount" ? (
        <section className={styles.simpleFlow} aria-label="División por monto">
          <p>Saldo pendiente</p><h3><PriceTag cents={tableRemainingCents} /></h3>
          <p className={styles.simpleCopy}>Ingresá el monto a pagar y elegí el medio de pago en la pantalla de cobro. Podés repetir el proceso hasta llegar a $0.</p>
          <Button onClick={() => onPayOrder?.()} disabled={disabled || !onPayOrder}>Ingresar monto y cobrar</Button>
        </section>
      ) : null}

      {method !== null && unassignedUnits > 0 ? <div className={styles.footerAction}><Button variant="secondary" onClick={onAttemptClose} disabled={disabled}>Revisar cierre de mesa</Button></div> : null}

      {createOpen ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => setCreateOpen(false)}>
          <section className={styles.createModal} role="dialog" aria-modal="true" aria-labelledby="create-person-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}><div><p className={styles.eyebrow}>Nueva cuenta</p><h3 id="create-person-title">Agregar persona</h3></div><button type="button" onClick={() => setCreateOpen(false)} aria-label="Cerrar creación de cuenta">×</button></div>
            <div className={styles.creationPaths}>
              <label className={styles.selectField}>Cliente existente<select value={selectedCustomerId} onChange={(event) => onSelectCustomer(event.target.value)} disabled={disabled || customers.length === 0}><option value="">Seleccionar cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.displayName}</option>)}</select></label>
              <Button onClick={() => { onCreateCustomerAccount(); setCreateOpen(false); }} disabled={disabled || selectedCustomerId.length === 0}>Crear cuenta de cliente</Button>
              <div className={styles.or}><span>o</span></div>
              <Input label="Cuenta con nombre libre" value={freeName} onChange={onFreeNameChange} placeholder="Juan P." />
              <Button variant="secondary" onClick={() => { onCreateFreeNameAccount(); setCreateOpen(false); }} disabled={disabled || freeName.trim().length === 0}>Crear cuenta libre</Button>
            </div>
          </section>
        </div>
      ) : null}

      {detailsAccount ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => setDetailsAccountId(null)}>
          <section className={styles.createModal} role="dialog" aria-modal="true" aria-labelledby="payment-details-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}><div><p className={styles.eyebrow}>Historial de pagos</p><h3 id="payment-details-title">{detailsAccount.ownerLabel}</h3></div><button type="button" onClick={() => setDetailsAccountId(null)} aria-label="Cerrar detalle de pagos">×</button></div>
            <div className={styles.paymentTotal}><span>Total pagado</span><PriceTag cents={detailsAccount.paidCents} /></div>
            <ul className={styles.paymentList}>{(detailsAccount.payments ?? []).map((payment) => <li key={payment.id}><span><strong>{payment.methodLabel}</strong><small>{formatDate(payment.recordedAt)}</small></span><PriceTag cents={payment.amountCents} /></li>)}</ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}
