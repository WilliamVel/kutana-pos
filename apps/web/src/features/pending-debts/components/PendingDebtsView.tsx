import { useEffect, useMemo, useRef, useState } from "react";
import type { Customer } from "@kutana/shared/billing/model/personal-account.js";
import { Button } from "../../../design-system/atoms/Button.js";
import { Input } from "../../../design-system/atoms/Input.js";
import { ButtonRow } from "../../../design-system/molecules/ButtonRow.js";
import { PriceTag } from "../../../design-system/molecules/PriceTag.js";
import { formatCents } from "../../../design-system/molecules/format-cents.js";
import styles from "./PendingDebtsView.module.css";

export interface PendingCustomerDebtRow {
  readonly customerId: string;
  readonly displayName: string;
  readonly balanceCents: number;
  readonly lastDebtAt: string;
  readonly debitCents: number;
  readonly paidCents: number;
  readonly sourceCount: number;
}

export interface UnlinkedPendingAccountRow {
  readonly accountId: string;
  readonly freeName: string;
  readonly orderId: string;
  readonly tableId: string;
  readonly remainingCents: number;
  readonly createdAt: string;
  readonly originalCents: number;
  readonly paidCents: number;
}

export interface PendingDebtsViewProps {
  readonly customerDebts: readonly PendingCustomerDebtRow[];
  readonly unlinkedAccounts: readonly UnlinkedPendingAccountRow[];
  readonly customers: readonly Customer[];
  readonly customerPaymentDrafts: Readonly<Record<string, string>>;
  readonly accountPaymentDrafts: Readonly<Record<string, string>>;
  readonly linkCustomerDrafts: Readonly<Record<string, string>>;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly message: string | null;
  readonly customerPaymentErrors: Readonly<Record<string, string>>;
  readonly accountPaymentErrors: Readonly<Record<string, string>>;
  readonly globalTotals?: { readonly totalPendingCents: number; readonly identifiedTotalCents: number; readonly unlinkedTotalCents: number; readonly totalRows: number } | null;
  readonly serverPagination?: { readonly page: number; readonly pageSize: number; readonly totalRows: number };
  readonly onCustomerListQueryChange?: (query: { search: string; sort: "activity" | "balance"; page: number }) => void;
  readonly onCustomerPaymentDraftChange: (customerId: string, amount: string) => void;
  readonly onPayCustomerDebt: (customerId: string) => void;
  readonly onAccountPaymentDraftChange: (accountId: string, amount: string) => void;
  readonly onPayUnlinkedAccount: (accountId: string) => void;
  readonly onLinkCustomerDraftChange: (accountId: string, customerId: string) => void;
  readonly onLinkToCustomer: (accountId: string) => void;
  readonly onCreateCustomerFromAccount: (accountId: string) => void;
}

const dateFormatter = new Intl.DateTimeFormat("es", { month: "short", day: "numeric", year: "numeric" });
const PAGE_SIZE = 20;

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

function formatMoney(cents: number): string {
  return formatCents(cents);
}

function customerActivity(a: PendingCustomerDebtRow, b: PendingCustomerDebtRow): number {
  return new Date(b.lastDebtAt).getTime() - new Date(a.lastDebtAt).getTime();
}

export function PendingDebtsView({
  customerDebts,
  unlinkedAccounts,
  customers,
  customerPaymentDrafts,
  accountPaymentDrafts,
  linkCustomerDrafts,
  disabled = false,
  loading = false,
  message,
  customerPaymentErrors,
  accountPaymentErrors,
  onCustomerPaymentDraftChange,
  onPayCustomerDebt,
  onAccountPaymentDraftChange,
  onPayUnlinkedAccount,
  onLinkCustomerDraftChange,
  onLinkToCustomer,
  onCreateCustomerFromAccount,
  globalTotals,
  serverPagination,
  onCustomerListQueryChange,
}: PendingDebtsViewProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"activity" | "balance">("activity");
  const [page, setPage] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const didScheduleSearch = useRef(false);

  const identifiedTotalCents = globalTotals?.identifiedTotalCents ?? customerDebts.reduce((sum, debt) => sum + debt.balanceCents, 0);
  const unlinkedTotalCents = globalTotals?.unlinkedTotalCents ?? unlinkedAccounts.reduce((sum, account) => sum + account.remainingCents, 0);
  const totalPendingCents = globalTotals?.totalPendingCents ?? identifiedTotalCents + unlinkedTotalCents;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredDebts = useMemo(() => serverPagination ? customerDebts : customerDebts
    .filter((debt) => debt.displayName.toLocaleLowerCase().includes(normalizedQuery))
    .sort(sort === "balance" ? (a, b) => b.balanceCents - a.balanceCents : customerActivity), [customerDebts, normalizedQuery, sort, serverPagination]);
  const pageCount = Math.max(1, Math.ceil((serverPagination?.totalRows ?? filteredDebts.length) / (serverPagination?.pageSize ?? PAGE_SIZE)));
  const currentPage = serverPagination?.page ?? Math.min(page, pageCount - 1);
  const visibleDebts = serverPagination ? filteredDebts : filteredDebts.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const updateQuery = (value: string): void => {
    setQuery(value);
    setPage(0);
  };

  useEffect(() => {
    if (!didScheduleSearch.current) {
      didScheduleSearch.current = true;
      return;
    }
    const timer = window.setTimeout(() => onCustomerListQueryChange?.({ search: query, sort, page: 0 }), 250);
    return () => window.clearTimeout(timer);
  }, [onCustomerListQueryChange, query, sort]);

  const changeSort = (value: "activity" | "balance"): void => {
    setSort(value);
    setPage(0);
  };

  const selectCustomer = (customerId: string): void => {
    setSelectedCustomerId((current) => current === customerId ? null : customerId);
  };

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <h2>Deudas pendientes</h2>
          <p>Consulta y cobra los saldos pendientes.</p>
        </div>
      </header>

      {message ? <div role="status" aria-live="polite" className={styles.message}>{message}</div> : null}

      <section aria-label="Resumen de cobros" className={styles.summaryGrid}>
        <article className={`${styles.summaryCard} ${styles.summaryPrimary}`}>
          <span>Total pendiente</span>
          <strong>{globalTotals === null ? "Cargando…" : <PriceTag cents={totalPendingCents} />}</strong>
          <p>{globalTotals === null ? "Actualizando saldos" : `${customerDebts.length + unlinkedAccounts.length} ${customerDebts.length + unlinkedAccounts.length === 1 ? "deuda abierta" : "deudas abiertas"}`}</p>
        </article>
        {customerDebts.length > 0 && (unlinkedAccounts.length > 0 || customerDebts.length > 1) ? (
          <article className={styles.summaryCard}>
            <span>Clientes identificados</span>
            <strong><PriceTag cents={identifiedTotalCents} /></strong>
            <p>{customerDebts.length} {customerDebts.length === 1 ? "cliente" : "clientes"}</p>
          </article>
        ) : null}
        {unlinkedAccounts.length > 0 && (customerDebts.length > 0 || unlinkedAccounts.length > 1) ? (
          <article className={styles.summaryCard}>
            <span>Cuentas con nombre libre</span>
            <strong><PriceTag cents={unlinkedTotalCents} /></strong>
            <p>{unlinkedAccounts.length} {unlinkedAccounts.length === 1 ? "cuenta" : "cuentas"}</p>
          </article>
        ) : null}
      </section>

      <section aria-label="Deudas de clientes identificados" className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <h3>Clientes identificados</h3>
            <p>{loading && globalTotals === null ? "Cargando saldos…" : `${customerDebts.length} ${customerDebts.length === 1 ? "cliente con saldo pendiente" : "clientes con saldo pendiente"}`}</p>
          </div>
        </div>
        <>
            <div className={styles.listToolbar}>
              <label className={styles.searchField}>
                <span>Buscar cliente</span>
                <div className={styles.searchInputWrap}>
                  <input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="Nombre del cliente" type="search" />
                  {query ? <button type="button" className={styles.clearSearch} onClick={(event) => { updateQuery(""); event.currentTarget.parentElement?.querySelector<HTMLInputElement>("input")?.focus(); }} aria-label="Borrar búsqueda" title="Borrar búsqueda">×</button> : null}
                </div>
              </label>
              <label className={styles.sortField}>
                <span>Ordenar por</span>
                <select value={sort} onChange={(event) => changeSort(event.target.value as "activity" | "balance")}>
                  <option value="activity">Actividad reciente</option>
                  <option value="balance">Saldo mayor</option>
                </select>
              </label>
              <span className={styles.resultCount} aria-live="polite">{loading ? "Buscando…" : `${serverPagination?.totalRows ?? filteredDebts.length} ${(serverPagination?.totalRows ?? filteredDebts.length) === 1 ? "cliente" : "clientes"}`}</span>
            </div>
            {loading ? <p className={styles.emptyState} aria-live="polite">Buscando clientes…</p> : customerDebts.length === 0 ? <p className={styles.emptyState}>No hay deudas de clientes identificados.</p> : visibleDebts.length === 0 ? <p className={styles.emptyState}>No encontramos clientes con ese nombre.</p> : (
              <div className={styles.debtList}>
                {visibleDebts.map((debt) => (
                  <div key={debt.customerId} className={styles.debtItem}>
                    <article aria-label={`Deuda de ${debt.displayName}`} className={`${styles.debtRow} ${selectedCustomerId === debt.customerId ? styles.selectedRow : ""}`}>
                      <div className={styles.rowIdentity}>
                        <strong>{debt.displayName}</strong>
                        <span>{debt.sourceCount > 0 ? `${debt.sourceCount} ${debt.sourceCount === 1 ? "cuenta" : "cuentas"} · ` : ""}Última actividad {formatDate(debt.lastDebtAt)}</span>
                      </div>
                      <div className={styles.rowBalance}><span>Saldo</span><strong><PriceTag cents={debt.balanceCents} /></strong></div>
                      <Button variant={selectedCustomerId === debt.customerId ? "secondary" : "primary"} onClick={() => selectCustomer(debt.customerId)} ariaLabel={`${selectedCustomerId === debt.customerId ? "Cerrar cobro de" : "Cobrar a"} ${debt.displayName}`}>
                        {selectedCustomerId === debt.customerId ? "Cerrar" : "Cobrar"}
                      </Button>
                    </article>
                    {selectedCustomerId === debt.customerId ? (
                      <div className={styles.paymentPanel} aria-label={`Registrar pago para ${debt.displayName}`}>
                        <div className={styles.paymentContext}>
                          <strong>{debt.displayName}</strong>
                          <span>{formatMoney(debt.debitCents)} acumulados · {formatMoney(debt.paidCents)} abonados · saldo {formatMoney(debt.balanceCents)}</span>
                        </div>
                        <Input
                          label="Importe del pago (USD)"
                          type="text"
                          inputMode="decimal"
                          value={customerPaymentDrafts[debt.customerId] ?? ""}
                          onChange={(amount) => onCustomerPaymentDraftChange(debt.customerId, amount)}
                          error={customerPaymentErrors[debt.customerId]}
                          placeholder="0,00"
                        />
                        <div className={styles.actionColumn}>
                          <span className={styles.reviewText}>Saldo después: {formatMoney(Math.max(0, debt.balanceCents - parseDisplayAmount(customerPaymentDrafts[debt.customerId])))}</span>
                          <Button onClick={() => onPayCustomerDebt(debt.customerId)} disabled={disabled || Boolean(customerPaymentErrors[debt.customerId]) || !customerPaymentDrafts[debt.customerId]}>Registrar pago</Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            {pageCount > 1 ? <nav className={styles.pagination} aria-label="Paginación de clientes">
              <Button variant="secondary" onClick={() => { const nextPage = Math.max(0, currentPage - 1); setPage(nextPage); onCustomerListQueryChange?.({ search: query, sort, page: nextPage }); }} disabled={currentPage === 0}>Anterior</Button>
              <span>Página {currentPage + 1} de {pageCount}</span>
              <Button variant="secondary" onClick={() => { const nextPage = Math.min(pageCount - 1, currentPage + 1); setPage(nextPage); onCustomerListQueryChange?.({ search: query, sort, page: nextPage }); }} disabled={currentPage === pageCount - 1}>Siguiente</Button>
            </nav> : null}
          </>
      </section>

      {unlinkedAccounts.length > 0 ? <section aria-label="Cuentas pendientes sin cliente vinculado" className={styles.card}>
        <div className={styles.sectionHeader}>
          <div><p className={styles.stepLabel}>Cobrar o vincular</p><h3>Cuentas con nombre libre</h3><p>Cobrá directamente o vinculá la cuenta con un cliente real.</p></div>
          <span className={styles.sectionCount}>{unlinkedAccounts.length} {unlinkedAccounts.length === 1 ? "cuenta" : "cuentas"}</span>
        </div>
        <div className={styles.rows}>
          {unlinkedAccounts.map((account) => <article key={account.accountId} aria-label={`Cuenta pendiente de ${account.freeName}`} className={styles.row}>
            <div className={styles.rowIdentity}><strong>{account.freeName}</strong><span>Orden {account.orderId} · mesa {account.tableId}</span><small>Creada {formatDate(account.createdAt)} · {formatMoney(account.originalCents)} original · {formatMoney(account.paidCents)} abonados</small></div>
            <div className={styles.balanceBlock}><span>Restante</span><strong><PriceTag cents={account.remainingCents} /></strong></div>
            <div className={styles.paymentAction}>
              <Input label={`Monto de pago para ${account.freeName} (USD)`} type="text" inputMode="decimal" value={accountPaymentDrafts[account.accountId] ?? ""} onChange={(amount) => onAccountPaymentDraftChange(account.accountId, amount)} error={accountPaymentErrors[account.accountId]} placeholder="0,00" />
              <ButtonRow><Button onClick={() => onPayUnlinkedAccount(account.accountId)} disabled={disabled || Boolean(accountPaymentErrors[account.accountId]) || !accountPaymentDrafts[account.accountId]}>Registrar pago</Button></ButtonRow>
            </div>
            <div className={styles.linkBox}>
              <label className={styles.field}>Vincular con cliente existente<select value={linkCustomerDrafts[account.accountId] ?? ""} onChange={(event) => onLinkCustomerDraftChange(account.accountId, event.target.value)} disabled={disabled || customers.length === 0}><option value="">Seleccionar cliente</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.displayName}</option>)}</select></label>
              <Button variant="secondary" onClick={() => onLinkToCustomer(account.accountId)} disabled={disabled || !(linkCustomerDrafts[account.accountId] ?? "")}>Vincular cuenta</Button>
              <Button variant="secondary" onClick={() => onCreateCustomerFromAccount(account.accountId)} disabled={disabled}>Crear cliente desde nombre libre</Button>
            </div>
          </article>)}
        </div>
      </section> : null}
    </div>
  );
}

function parseDisplayAmount(value: string | undefined): number {
  if (!value) return 0;
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return 0;
  const [whole, fraction = ""] = normalized.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
