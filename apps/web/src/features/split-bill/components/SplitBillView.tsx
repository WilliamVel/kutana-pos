import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
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
import { sectionizeOrderTicketLines } from "../../ordering/visual-ordering.js";
import styles from "./SplitBillView.module.css";
import { SplitBillOverview, type SplitMethod } from "./SplitBillOverview.js";

export interface AccountAssignmentLine {
  readonly id: string;
  readonly lineItemIds: readonly string[];
  readonly productId?: string;
  readonly pourSizeMl?: number | null;
  readonly isAdjustment?: boolean;
  readonly categoryName?: string;
  readonly stockKind?: "unit" | "volume";
  readonly name: string;
  readonly presentation?: string | null;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly totalCents: number;
  readonly unassignedQuantity: number;
}

export interface AssignedAccountLine {
  readonly allocationIds: readonly string[];
  readonly productId?: string;
  readonly pourSizeMl?: number | null;
  readonly isAdjustment?: boolean;
  readonly categoryName?: string;
  readonly stockKind?: "unit" | "volume";
  readonly name: string;
  readonly presentation?: string | null;
  readonly quantity: number;
  readonly unitPriceCents?: number;
  readonly taxRateBp?: number;
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
  readonly processing?: boolean;
  readonly onSelectCustomer: (customerId: string) => void;
  readonly onFreeNameChange: (freeName: string) => void;
  readonly onCreateCustomerAccount: () => void;
  readonly onCreateFreeNameAccount: () => void;
  readonly onAllocationDraftChange: (draft: AccountAllocationDraft) => void;
  readonly onAssignQuantity: (draft?: AccountAllocationDraft) => boolean | Promise<boolean> | void;
  readonly onAssignQuantities?: (
    drafts: readonly AccountAllocationDraft[],
  ) => boolean | Promise<boolean> | void;
  readonly onPayAccount: (accountId: string) => void;
  readonly onMarkPending: (accountId: string) => void;
  readonly onDeleteAccount: (accountId: string) => Promise<boolean> | void;
  readonly onRemoveAllocation?: (
    accountId: string,
    allocationIds: readonly string[],
    quantity?: number,
  ) => boolean | Promise<boolean> | void;
  readonly onAttemptClose: () => void;
  readonly onPayOrder?: () => void;
}

function displayProductName(name: string, presentation?: string | null): string {
  if (!presentation) return name;
  const size = presentation.match(/\d+(?:\.\d+)?/)?.[0];
  return size ? name.replace(new RegExp(`\\s*${size}\\s*ml\\b`, "i"), "").trim() : name;
}

function formatStatus(status: PersonalAccountStatus): string {
  return {
    open: "Abierta",
    partially_paid: "Pago parcial",
    pending: "Pendiente",
    paid: "Pagado",
    void: "Anulada",
  }[status];
}

function sameSet(left: Set<string>, right: Set<string>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function sameMap(left: Map<string, string | number>, right: Map<string, string | number>): boolean {
  return (
    left.size === right.size && [...left].every(([key, value]) => Object.is(right.get(key), value))
  );
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
  processing = false,
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
  // Recipient and product list are separate navigation concepts.
  const [activePersonId, setActivePersonId] = useState<string>(accounts[0]?.id ?? "");
  const [productView, setProductView] = useState<"assigned" | "unassigned">(
    accounts.length > 0 ? "assigned" : "unassigned",
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsAccountId, setDetailsAccountId] = useState<string | null>(null);
  const [equalPeople, setEqualPeople] = useState(2);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(() => new Set());
  const [selectedQuantities, setSelectedQuantities] = useState<Map<string, number>>(
    () => new Map(),
  );
  const [quantityDrafts, setQuantityDrafts] = useState<Map<string, string>>(() => new Map());
  const [returnLine, setReturnLine] = useState<AssignedAccountLine | null>(null);
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnPopoverPosition, setReturnPopoverPosition] = useState({ top: 0, left: 0 });
  const returnTriggerRef = useRef<HTMLButtonElement | null>(null);
  const returnChoiceRef = useRef<HTMLDivElement | null>(null);
  const [reviewAccountId, setReviewAccountId] = useState<string | null>(null);
  const [removeAccountId, setRemoveAccountId] = useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const removeConfirmRef = useRef<HTMLButtonElement | null>(null);
  const actionMenuTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (accounts.length > 0 && method === null) setMethod("person");
    if (activePersonId && !accounts.some((account) => account.id === activePersonId)) {
      setActivePersonId(accounts[0]?.id ?? "");
    }
    if (reviewAccountId && !accounts.some((account) => account.id === reviewAccountId)) {
      setReviewAccountId(null);
    }
  }, [accounts, activePersonId, method, reviewAccountId]);

  useEffect(() => {
    if (
      allocationDraft.accountId &&
      accounts.some((account) => account.id === allocationDraft.accountId)
    ) {
      setActivePersonId((current) => (current ? current : allocationDraft.accountId));
    }
  }, [accounts.length, allocationDraft.accountId]);

  useEffect(() => {
    setSelectedLineIds((current) => {
      const next = new Set(
        [...current].filter((id) =>
          lines.some((line) => line.id === id && line.unassignedQuantity > 0),
        ),
      );
      return sameSet(current, next) ? current : next;
    });
    setSelectedQuantities((current) => {
      const next = new Map<string, number>();
      for (const [id, quantity] of current) {
        const available = lines.find((line) => line.id === id)?.unassignedQuantity;
        if (available) next.set(id, Math.min(quantity, available));
      }
      return sameMap(current, next) ? current : next;
    });
    setQuantityDrafts((current) => {
      const next = new Map<string, string>();
      for (const [id, draft] of current) {
        if (lines.some((line) => line.id === id && line.unassignedQuantity > 0)) {
          next.set(id, draft);
        }
      }
      return sameMap(current, next) ? current : next;
    });
  }, [lines]);

  const metadataByProductId = useMemo(
    () =>
      new Map(
        [...lines, ...accounts.flatMap((account) => account.assignedLines ?? [])].flatMap((line) =>
          line.productId
            ? ([
                [
                  line.productId,
                  {
                    categoryName: line.categoryName,
                    stockKind: line.stockKind,
                    pourSizeMl: line.pourSizeMl,
                  },
                ],
              ] as const)
            : [],
        ),
      ),
    [accounts, lines],
  );
  const orderedUnassignedSections = useMemo(
    () =>
      sectionizeOrderTicketLines(
        lines.filter((line) => line.unassignedQuantity > 0),
        metadataByProductId,
      ),
    [lines, metadataByProductId],
  );
  const unassignedUnits = lines.reduce((sum, line) => sum + line.unassignedQuantity, 0);
  const assignedCents = accounts.reduce((sum, account) => sum + account.totalCents, 0);
  const unassignedCents = Math.max(0, tableTotalCents - assignedCents);
  const selectedAccount = accounts.find((account) => account.id === activePersonId) ?? null;
  const assignedSections = useMemo(
    () =>
      selectedAccount
        ? sectionizeOrderTicketLines(selectedAccount.assignedLines ?? [], metadataByProductId)
        : [],
    [metadataByProductId, selectedAccount],
  );
  const destinationAccount =
    productView === "unassigned"
      ? selectedAccount
      : (accounts.find((account) => account.id === allocationDraft.accountId) ?? null);
  const detailsAccount = accounts.find((account) => account.id === detailsAccountId) ?? null;
  const removeAccount = accounts.find((account) => account.id === removeAccountId) ?? null;
  const removeUnits =
    removeAccount?.assignedLines?.reduce((sum, line) => sum + line.quantity, 0) ?? 0;
  const removeValue = removeAccount?.totalCents ?? 0;
  const equalShares = useMemo(
    () =>
      largestRemainderSplit(
        tableRemainingCents,
        Array.from({ length: equalPeople }, () => 1),
      ),
    [equalPeople, tableRemainingCents],
  );
  const formatDate = (value: string): string =>
    new Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "short" }).format(
      new Date(value),
    );

  const selectAccount = (accountId: string): void => {
    const account = accounts.find((candidate) => candidate.id === accountId);
    setActivePersonId(accountId);
    setProductView("assigned");
    setReviewAccountId(null);
    setActionMenuOpen(false);
    setSelectedLineIds(new Set());
    if (account && account.status !== "paid" && account.status !== "pending") {
      onAllocationDraftChange({ ...allocationDraft, accountId });
    }
  };

  const selectUnassigned = (): void => {
    setProductView("unassigned");
    setReviewAccountId(null);
    setActionMenuOpen(false);
    setSelectedLineIds(new Set());
    onAllocationDraftChange({ ...allocationDraft, accountId: activePersonId });
  };

  const selectAssigned = (): void => {
    if (!activePersonId) return;
    setProductView("assigned");
    setReviewAccountId(null);
    setActionMenuOpen(false);
    setSelectedLineIds(new Set());
    onAllocationDraftChange({ ...allocationDraft, accountId: activePersonId });
  };

  const requestMethod = (nextMethod: SplitMethod): void => {
    if (nextMethod === method) return;
    const hasProtectedWork =
      assignedCents > 0 ||
      accounts.some(
        (account) =>
          account.paidCents > 0 || account.status === "paid" || account.status === "pending",
      );
    if (
      hasProtectedWork &&
      !window.confirm(
        "Ya hay productos asignados o pagos registrados. ¿Querés cambiar el método sin modificar esos datos?",
      )
    )
      return;
    setMethod(nextMethod);
  };

  const commitQuantity = (value: string, maximum: number): number => {
    const parsed = /^\d+$/.test(value) ? Number(value) : 1;
    return Number.isFinite(parsed) ? Math.max(1, Math.min(maximum, parsed)) : 1;
  };

  const updateQuantity = (lineId: string, next: number, maximum: number): void => {
    const quantity = Math.max(1, Math.min(maximum, next));
    setSelectedQuantities((current) => new Map(current).set(lineId, quantity));
    setQuantityDrafts((current) => new Map(current).set(lineId, String(quantity)));
    onAllocationDraftChange({
      ...allocationDraft,
      lineItemId: lineId,
      quantity: String(quantity),
    });
  };

  const updateQuantityDraft = (lineId: string, value: string, maximum: number): void => {
    setQuantityDrafts((current) => new Map(current).set(lineId, value));
    if (!/^\d*$/.test(value) || value === "") {
      onAllocationDraftChange({ ...allocationDraft, lineItemId: lineId, quantity: value });
      return;
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      setSelectedQuantities((current) =>
        new Map(current).set(lineId, Math.max(1, Math.min(maximum, parsed))),
      );
    }
    onAllocationDraftChange({ ...allocationDraft, lineItemId: lineId, quantity: value });
  };

  const toggleLine = (lineId: string): void => {
    setSelectedLineIds((current) => {
      const next = new Set(current);
      if (next.has(lineId)) {
        next.delete(lineId);
        setSelectedQuantities((quantities) => {
          const nextQuantities = new Map(quantities);
          nextQuantities.delete(lineId);
          return nextQuantities;
        });
      } else {
        next.add(lineId);
        setSelectedQuantities((quantities) => new Map(quantities).set(lineId, 1));
      }
      return next;
    });
  };

  const selectedLines = lines.filter(
    (line) => selectedLineIds.has(line.id) && line.unassignedQuantity > 0,
  );
  const selectedUnits = selectedLines.reduce(
    (sum, line) => sum + (selectedQuantities.get(line.id) ?? 1),
    0,
  );
  const selectedTotalCents = selectedLines.reduce(
    (sum, line) =>
      sum + Math.round((line.totalCents / line.quantity) * (selectedQuantities.get(line.id) ?? 1)),
    0,
  );
  const canAssignToDestination =
    destinationAccount &&
    destinationAccount.status !== "paid" &&
    destinationAccount.status !== "pending";
  const showAssignmentWorkspace =
    reviewAccountId === null &&
    productView === "unassigned" &&
    unassignedUnits > 0 &&
    Boolean(canAssignToDestination);

  useEffect(() => {
    if (!removeAccountId) return;
    removeConfirmRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setRemoveAccountId(null);
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = document.querySelector<HTMLElement>(
        '[role="dialog"][aria-labelledby="remove-person-title"]',
      );
      if (!dialog) return;
      const focusable = [
        ...dialog.querySelectorAll<HTMLElement>(
          "button:not([disabled]), [href], input, select, textarea",
        ),
      ];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [removeAccountId]);

  const closeRemoveDialog = (): void => {
    setRemoveAccountId(null);
    window.setTimeout(() => actionMenuTriggerRef.current?.focus(), 0);
  };

  const finishDeletion = (accountId: string, message: string): void => {
    toast.success(message, { duration: 2600 });
    setProductView("unassigned");
    setReviewAccountId(null);
    if (allocationDraft.accountId === accountId) {
      onAllocationDraftChange({ ...allocationDraft, accountId: "" });
    }
  };

  const deleteAccountWithFeedback = (accountId: string, message: string): void => {
    const result = onDeleteAccount(accountId);
    if (result && typeof result.then === "function") {
      void result.then((success) => {
        if (success !== false) finishDeletion(accountId, message);
      });
      return;
    }
    finishDeletion(accountId, message);
  };

  const requestDeleteAccount = (): void => {
    setActionMenuOpen(false);
    if (!selectedAccount) return;
    if ((selectedAccount.payments?.length ?? 0) > 0 || selectedAccount.paidCents > 0) {
      toast.error(
        `No se puede eliminar a ${selectedAccount.ownerLabel} porque tiene pagos registrados. Conserva el historial de cobros.`,
        { duration: 2600 },
      );
      return;
    }
    if ((selectedAccount.assignedLines?.length ?? 0) > 0) {
      setRemoveAccountId(selectedAccount.id);
      return;
    }
    deleteAccountWithFeedback(
      selectedAccount.id,
      `${selectedAccount.ownerLabel} fue eliminada de la división.`,
    );
  };

  const confirmRemoveAccount = (): void => {
    if (!removeAccount) return;
    deleteAccountWithFeedback(
      removeAccount.id,
      removeUnits > 0
        ? `${removeAccount.ownerLabel} fue eliminada y ${removeUnits} unidad(es) volvieron a Sin asignar.`
        : `${removeAccount.ownerLabel} fue eliminada de la división.`,
    );
    closeRemoveDialog();
  };

  useLayoutEffect(() => {
    if (!returnLine || !returnTriggerRef.current || !returnChoiceRef.current) return;
    const trigger = returnTriggerRef.current.getBoundingClientRect();
    const popover = returnChoiceRef.current.getBoundingClientRect();
    const gap = 8;
    const top =
      trigger.bottom + gap + popover.height <= window.innerHeight
        ? trigger.bottom + gap
        : Math.max(gap, trigger.top - popover.height - gap);
    const left = Math.min(
      Math.max(gap, trigger.right - popover.width),
      window.innerWidth - popover.width - gap,
    );
    setReturnPopoverPosition({ top, left });
    returnChoiceRef.current.focus();
    const reposition = (): void => {
      const currentTrigger = returnTriggerRef.current;
      const currentPopover = returnChoiceRef.current;
      if (!currentTrigger || !currentPopover) return;
      const nextTrigger = currentTrigger.getBoundingClientRect();
      const nextPopover = currentPopover.getBoundingClientRect();
      const nextTop =
        nextTrigger.bottom + gap + nextPopover.height <= window.innerHeight
          ? nextTrigger.bottom + gap
          : Math.max(gap, nextTrigger.top - nextPopover.height - gap);
      const nextLeft = Math.min(
        Math.max(gap, nextTrigger.right - nextPopover.width),
        window.innerWidth - nextPopover.width - gap,
      );
      setReturnPopoverPosition({ top: nextTop, left: nextLeft });
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [returnLine, returnQuantity]);

  useEffect(() => {
    if (!returnLine) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") closeReturnChoice();
    };
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as Node;
      if (
        !returnChoiceRef.current?.contains(target) &&
        !returnTriggerRef.current?.contains(target)
      ) {
        closeReturnChoice();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [returnLine]);

  const closeReturnChoice = (): void => {
    setReturnLine(null);
    window.setTimeout(() => returnTriggerRef.current?.focus(), 0);
  };

  const returnUnits = async (line: AssignedAccountLine, quantity: number): Promise<void> => {
    if (!selectedAccount || !onRemoveAllocation) return;
    const success = await onRemoveAllocation(selectedAccount.id, line.allocationIds, quantity);
    if (success === false) return;
    const units = quantity === 1 ? "1 unidad" : `${quantity} unidades`;
    toast.success(`${units} devuelta(s) a Sin asignar`, { duration: 2600 });
    closeReturnChoice();
  };

  const assignSelected = async (): Promise<void> => {
    if (!destinationAccount || selectedLines.length === 0) return;
    const drafts = selectedLines.map((line) => ({
      accountId: destinationAccount.id,
      lineItemId: line.id,
      quantity: String(
        commitQuantity(
          quantityDrafts.get(line.id) ?? String(selectedQuantities.get(line.id) ?? 1),
          line.unassignedQuantity,
        ),
      ),
    }));
    const result = onAssignQuantities
      ? await onAssignQuantities(drafts)
      : await Promise.all(drafts.map((draft) => onAssignQuantity(draft))).then((results) =>
          results.every((success) => success !== false),
        );
    if (result === false) return;
    setSelectedLineIds(new Set());
    setProductView("unassigned");
    toast.success(`${drafts.length} producto(s) asignado(s) a ${destinationAccount.ownerLabel}`, {
      duration: 2600,
    });
  };

  return (
    <div className={styles.screen}>
      <SplitBillOverview
        tableLabel={tableLabel}
        tableTotalCents={tableTotalCents}
        assignedCents={assignedCents}
        unassignedCents={unassignedCents}
        tablePaidCents={tablePaidCents}
        tableRemainingCents={tableRemainingCents}
        method={method}
        onChooseMethod={setMethod}
        onChangeMethod={requestMethod}
      />

      {reviewMessage ? (
        <div role="alert" className={styles.review}>
          {reviewMessage}
        </div>
      ) : null}
      {method === "person" ? (
        <section className={styles.personWorkspace} aria-label="División por persona">
          <section className={styles.peopleSection} aria-labelledby="people-section-title">
            <div className={styles.zoneHeading}>
              <h2 id="people-section-title">Personas de la cuenta</h2>
              <p>El importe de cada persona es el pendiente de cobro.</p>
            </div>
            <div className={styles.peopleNavigation}>
              <div className={styles.accountTabs} role="tablist" aria-label="Persona activa">
                {accounts.map((account) => {
                  const isSelected = activePersonId === account.id;
                  const statusPrefix =
                    account.status === "paid" ? "✓ " : account.status === "pending" ? "• " : "";
                  return (
                    <button
                      key={account.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      className={`${isSelected ? styles.tabActive : styles.tab} ${account.status === "paid" ? styles.tabPaid : account.status === "pending" ? styles.tabPending : ""}`}
                      onClick={() => selectAccount(account.id)}
                      aria-label={`Seleccionar cuenta ${account.ownerLabel}`}
                    >
                      {statusPrefix}
                      {account.ownerLabel}{" "}
                      <span className={styles.personBalance}>
                        <PriceTag cents={account.remainingCents} />
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={styles.addTab}
                  onClick={() => setCreateOpen(true)}
                  aria-label="Agregar persona"
                >
                  <span aria-hidden="true">+</span>
                  <span className={styles.addTabLabel}>Nueva persona</span>
                </button>
              </div>
            </div>
          </section>

          <section className={styles.detailSection} aria-labelledby="detail-section-title">
            <div className={styles.zoneHeading}>
              <h2 id="detail-section-title">Detalle de la cuenta</h2>
            </div>
            {selectedAccount ? (
              <div
                className={styles.viewSelector}
                role="tablist"
                aria-label={`Productos de ${selectedAccount.ownerLabel}`}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={productView === "assigned"}
                  className={productView === "assigned" ? styles.viewActive : styles.viewTab}
                  onClick={selectAssigned}
                >
                  Productos de {selectedAccount.ownerLabel}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={productView === "unassigned"}
                  className={productView === "unassigned" ? styles.viewActive : styles.viewTab}
                  onClick={selectUnassigned}
                  aria-label={`Sin asignar ${unassignedUnits} productos pendientes`}
                >
                  <span>Productos sin asignar</span>
                  <span className={styles.viewTabMeta}>
                    · {unassignedUnits}
                    {unassignedUnits > 0 ? " · " : ""}
                    {unassignedUnits > 0 ? <PriceTag cents={unassignedCents} /> : null}
                  </span>
                </button>
              </div>
            ) : (
              <div className={styles.viewSelector} role="status">
                Crea o selecciona una persona para asignar productos.
              </div>
            )}

            {showAssignmentWorkspace ? (
              <section aria-label="Productos pendientes" className={styles.productPanel}>
                <div className={styles.panelHeading}>
                  <div>
                    <h3>Productos sin asignar</h3>
                    <p>{unassignedUnits} unidad(es) disponibles</p>
                  </div>
                  <div className={styles.assignmentTarget}>
                    Asignando a:{" "}
                    <strong>{destinationAccount?.ownerLabel ?? "selecciona una persona"}</strong>
                  </div>
                </div>
                {lines.length === 0 ? (
                  <div role="alert" className={styles.emptyState}>
                    Para dividir la cuenta debe existir al menos un producto.
                  </div>
                ) : null}
                <div className={styles.productList}>
                  {orderedUnassignedSections.flatMap((section) => [
                    <h4 key={`${section.group}-unassigned`} className={styles.categoryHeading}>
                      {section.label}
                    </h4>,
                    ...section.lines.map((line) => {
                      const quantityDraft =
                        quantityDrafts.get(line.id) ??
                        (allocationDraft.lineItemId === line.id
                          ? allocationDraft.quantity
                          : String(selectedQuantities.get(line.id) ?? 1));
                      const quantity = Number(quantityDraft) || 1;
                      const isSelected = selectedLineIds.has(line.id);
                      return (
                        <article
                          key={line.id}
                          className={`${styles.productRow} ${isSelected ? styles.productRowSelected : ""}`}
                          aria-label={`Asignar ${line.name}`}
                        >
                          <label className={styles.productSelect}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleLine(line.id)}
                              disabled={disabled || !canAssignToDestination}
                              aria-label={`Seleccionar ${line.name}`}
                            />
                            <span className={styles.productInfo}>
                              <strong>{line.name}</strong>
                              {line.unassignedQuantity > 1 ? (
                                <small>{line.unassignedQuantity} disponibles</small>
                              ) : null}
                            </span>
                          </label>
                          <PriceTag
                            cents={Math.round(line.totalCents / line.quantity) * quantity}
                          />
                          {line.unassignedQuantity > 1 ? (
                            <div className={styles.quantityControl}>
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(line.id, quantity - 1, line.unassignedQuantity)
                                }
                                aria-label={`Reducir ${line.name}`}
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="1"
                                max={line.unassignedQuantity}
                                value={quantityDraft}
                                onChange={(event) =>
                                  updateQuantityDraft(
                                    line.id,
                                    event.target.value,
                                    line.unassignedQuantity,
                                  )
                                }
                                aria-label={`Cantidad para ${line.name}`}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(line.id, quantity + 1, line.unassignedQuantity)
                                }
                                aria-label={`Aumentar ${line.name}`}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <span className={styles.singleQuantity} aria-hidden="true" />
                          )}
                          <Button
                            ariaLabel="Asignar"
                            onClick={async () => {
                              if (!destinationAccount) return;
                              const success = await onAssignQuantity({
                                ...allocationDraft,
                                accountId: destinationAccount.id,
                                lineItemId: line.id,
                                quantity: String(
                                  commitQuantity(quantityDraft, line.unassignedQuantity),
                                ),
                              });
                              if (success === false) return;
                              toast.success(
                                `${commitQuantity(quantityDraft, line.unassignedQuantity)} ${displayProductName(line.name, line.presentation)} ${line.presentation ?? ""} asignada a ${destinationAccount.ownerLabel}`
                                  .replace(/\s+/g, " ")
                                  .trim(),
                                { duration: 2600 },
                              );
                            }}
                            disabled={disabled || !canAssignToDestination}
                          >
                            Asignar
                          </Button>
                        </article>
                      );
                    }),
                  ])}
                </div>
                {selectedLines.length > 0 && destinationAccount ? (
                  <div
                    className={styles.batchAction}
                    role="region"
                    aria-label="Asignación múltiple"
                  >
                    <span>
                      <strong>
                        {selectedUnits} unidad{selectedUnits === 1 ? "" : "es"}
                      </strong>{" "}
                      · {selectedLines.length} producto{selectedLines.length === 1 ? "" : "s"} ·{" "}
                      <PriceTag cents={selectedTotalCents} />
                    </span>
                    <Button onClick={assignSelected} disabled={disabled}>
                      Asignar a {destinationAccount.ownerLabel}
                    </Button>
                  </div>
                ) : null}
              </section>
            ) : unassignedUnits === 0 &&
              productView === "unassigned" &&
              (!selectedAccount || (selectedAccount.assignedLines?.length ?? 0) > 0) ? (
              <section className={styles.allAssigned} aria-label="Todos los productos asignados">
                <div>
                  <p className={styles.doneState}>✓ Todos los productos están asignados.</p>
                  <h3>Revisa las cuentas y completa el cobro</h3>
                  <p>Selecciona una persona para cobrar, dejar pendiente o revisar su estado.</p>
                </div>
                <Button onClick={onAttemptClose} disabled={disabled}>
                  Revisar cierre de mesa
                </Button>
              </section>
            ) : selectedAccount ? (
              <article
                className={styles.accountDetail}
                aria-label={`Saldo de cuenta de ${selectedAccount.ownerLabel}`}
              >
                <div className={styles.accountTitle}>
                  <div className={styles.accountHeading}>
                    <span className={styles.status}>{formatStatus(selectedAccount.status)}</span>
                    <h3 title={selectedAccount.ownerLabel}>{selectedAccount.ownerLabel}</h3>
                  </div>
                  <div className={styles.accountHeaderActions}>
                    <span className={styles.accountHeaderTotal}>
                      <small>Total asignado</small>
                      <PriceTag cents={selectedAccount.totalCents} />
                    </span>
                    <div className={styles.actionMenu}>
                      <button
                        ref={actionMenuTriggerRef}
                        type="button"
                        className={styles.actionMenuTrigger}
                        aria-label={`Acciones para ${selectedAccount.ownerLabel}`}
                        aria-haspopup="menu"
                        aria-expanded={actionMenuOpen}
                        title="Acciones"
                        onClick={() => setActionMenuOpen((open) => !open)}
                      >
                        ⋯
                      </button>
                      {actionMenuOpen ? (
                        <div className={styles.actionMenuList} role="menu">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={requestDeleteAccount}
                            disabled={disabled}
                          >
                            Eliminar persona
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.addProductsButton}
                  onClick={() => {
                    setProductView("unassigned");
                    setSelectedLineIds(new Set());
                    onAllocationDraftChange({ ...allocationDraft, accountId: selectedAccount.id });
                  }}
                  disabled={
                    disabled ||
                    selectedAccount.status === "paid" ||
                    selectedAccount.status === "pending"
                  }
                  title={
                    selectedAccount.status === "paid" || selectedAccount.status === "pending"
                      ? "No se pueden cambiar productos después de cobrar o dejar pendiente la cuenta"
                      : undefined
                  }
                >
                  + Agregar productos a {selectedAccount.ownerLabel}
                </button>
                {selectedAccount.status === "paid" || selectedAccount.status === "pending" ? (
                  <p className={styles.actionHint}>
                    No disponible: esta cuenta ya está{" "}
                    {selectedAccount.status === "paid" ? "pagada" : "marcada como pendiente"}.
                  </p>
                ) : null}
                <section
                  aria-label={`Productos asignados a ${selectedAccount.ownerLabel}`}
                  className={styles.assignedProducts}
                >
                  {(selectedAccount.assignedLines?.length ?? 0) === 0 ? (
                    <div className={styles.emptyState}>
                      <Icon name="receipt" size={20} />
                      <p>Esta persona todavía no tiene productos.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setActivePersonId(selectedAccount.id);
                          setProductView("unassigned");
                          setReviewAccountId(null);
                          onAllocationDraftChange({
                            ...allocationDraft,
                            accountId: selectedAccount.id,
                          });
                        }}
                      >
                        Asignar productos
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className={styles.assignedProductsHeader} aria-hidden="true">
                        <span />
                        <span>Producto</span>
                        <span>Precio unitario</span>
                        <span>
                          {selectedAccount.assignedLines?.some((line) => line.taxRateBp)
                            ? "Total (incl. impuestos)"
                            : "Importe total"}
                        </span>
                        <span />
                      </div>
                      <ul>
                        {assignedSections.flatMap((section) => [
                          <li key={`${section.group}-assigned`} className={styles.categoryHeading}>
                            {section.label}
                          </li>,
                          ...section.lines.map((line) => (
                            <li
                              key={line.allocationIds.join("-")}
                              className={styles.assignedProductRow}
                            >
                              <span className={styles.assignedProductQuantity}>
                                ×{line.quantity}
                              </span>
                              <span className={styles.assignedProductInfo}>
                                <strong>{displayProductName(line.name, line.presentation)}</strong>
                                <small>{line.presentation ?? "Unidad"}</small>
                              </span>
                              <span className={styles.assignedProductPrice}>
                                <small className={styles.columnLabel}>Precio unitario</small>
                                <PriceTag
                                  cents={
                                    line.unitPriceCents ??
                                    Math.round((line.totalCents ?? 0) / line.quantity)
                                  }
                                />
                              </span>
                              <span className={styles.assignedProductSubtotal}>
                                <small className={styles.columnLabel}>
                                  {line.taxRateBp ? "Total (incl. impuestos)" : "Importe total"}
                                </small>
                                <PriceTag cents={line.totalCents ?? 0} />
                              </span>
                              <button
                                type="button"
                                onClick={(event) => {
                                  returnTriggerRef.current = event.currentTarget;
                                  if (line.quantity === 1) void returnUnits(line, 1);
                                  else {
                                    setReturnQuantity(1);
                                    setReturnLine(line);
                                  }
                                }}
                                disabled={
                                  disabled ||
                                  selectedAccount.paidCents > 0 ||
                                  selectedAccount.status === "pending" ||
                                  selectedAccount.status === "paid"
                                }
                                aria-label={`Devolver ${line.name} de la cuenta de ${selectedAccount.ownerLabel}`}
                              >
                                Volver a Sin asignar
                              </button>
                              {returnLine === line ? (
                                <div
                                  ref={returnChoiceRef}
                                  className={styles.returnChoice}
                                  role="dialog"
                                  aria-label={`Cantidad a devolver de ${line.name}`}
                                  tabIndex={-1}
                                  style={{
                                    top: returnPopoverPosition.top,
                                    left: returnPopoverPosition.left,
                                  }}
                                >
                                  <strong>
                                    {displayProductName(line.name, line.presentation)}
                                  </strong>
                                  <span>
                                    {line.quantity}{" "}
                                    {line.quantity === 1 ? "unidad asignada" : "unidades asignadas"}
                                  </span>
                                  <div className={styles.returnQuantityControl}>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setReturnQuantity((current) => Math.max(1, current - 1))
                                      }
                                      disabled={returnQuantity === 1}
                                      aria-label="Reducir cantidad a devolver"
                                    >
                                      −
                                    </button>
                                    <output aria-live="polite">{returnQuantity}</output>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setReturnQuantity((current) =>
                                          Math.min(line.quantity, current + 1),
                                        )
                                      }
                                      disabled={returnQuantity === line.quantity}
                                      aria-label="Aumentar cantidad a devolver"
                                    >
                                      +
                                    </button>
                                  </div>
                                  <div className={styles.returnChoiceActions}>
                                    <Button
                                      ariaLabel={`Devolver ${returnQuantity} ${returnQuantity === 1 ? "unidad" : "unidades"}`}
                                      onClick={() => void returnUnits(line, returnQuantity)}
                                    >
                                      Volver a Sin asignar ({returnQuantity})
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      onClick={() => setReturnQuantity(line.quantity)}
                                    >
                                      Todas
                                    </Button>
                                    <button
                                      type="button"
                                      className={styles.returnCancel}
                                      onClick={closeReturnChoice}
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </li>
                          )),
                        ])}
                      </ul>
                    </>
                  )}
                </section>
                <dl className={styles.accountBalances}>
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
                <div className={styles.accountActions}>
                  <span className={styles.accountActionsNote}>
                    El total incluye los productos asignados a {selectedAccount.ownerLabel}. Los
                    pagos registrados se reflejan en “Pagado”.
                  </span>
                  <Button
                    ariaBusy={processing}
                    onClick={() => onPayAccount(selectedAccount.id)}
                    disabled={
                      disabled ||
                      processing ||
                      selectedAccount.remainingCents === 0 ||
                      selectedAccount.status === "pending"
                    }
                  >
                    <span className={styles.payButtonContent}>
                      {processing ? (
                        <span className={styles.paySpinner} aria-hidden="true" />
                      ) : null}
                      <span className={styles.payButtonLabel}>
                        {processing
                          ? "Procesando…"
                          : selectedAccount.remainingCents === 0
                            ? "Cuenta pagada"
                            : "Cobrar ·"}
                      </span>
                      {!processing && selectedAccount.remainingCents > 0 ? (
                        <PriceTag cents={selectedAccount.remainingCents} />
                      ) : null}
                    </span>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => onMarkPending(selectedAccount.id)}
                    disabled={
                      disabled ||
                      selectedAccount.remainingCents === 0 ||
                      selectedAccount.status === "pending"
                    }
                  >
                    Dejar pendiente
                  </Button>
                  {(selectedAccount.payments?.length ?? 0) > 0 ? (
                    <Button
                      variant="secondary"
                      onClick={() => setDetailsAccountId(selectedAccount.id)}
                    >
                      Ver pagos ({selectedAccount.payments?.length})
                    </Button>
                  ) : null}
                </div>
              </article>
            ) : null}
          </section>
        </section>
      ) : null}

      {method === "equal" ? (
        <section className={styles.simpleFlow} aria-label="División en partes iguales">
          <p>Saldo a dividir</p>
          <h3>
            <PriceTag cents={tableRemainingCents} />
          </h3>
          <label>Número de personas</label>
          <div className={styles.peopleStepper}>
            <button type="button" onClick={() => setEqualPeople(Math.max(2, equalPeople - 1))}>
              −
            </button>
            <strong>{equalPeople}</strong>
            <button type="button" onClick={() => setEqualPeople(Math.min(20, equalPeople + 1))}>
              +
            </button>
          </div>
          <div className={styles.equalResult}>
            <span>Cada persona</span>
            <strong>
              <PriceTag cents={equalShares[0] ?? 0} />
            </strong>
            {new Set(equalShares).size > 1 ? (
              <small>Una parte se ajusta 1 centavo para que el total sea exacto.</small>
            ) : null}
          </div>
          <Button onClick={() => onPayOrder?.()} disabled={disabled || !onPayOrder}>
            Comenzar cobro en {equalPeople} partes
          </Button>
        </section>
      ) : null}

      {method === "amount" ? (
        <section className={styles.simpleFlow} aria-label="División por monto">
          <p>Saldo pendiente</p>
          <h3>
            <PriceTag cents={tableRemainingCents} />
          </h3>
          <p className={styles.simpleCopy}>
            Ingresa el monto a pagar y elegí el medio de pago en la pantalla de cobro. Podés repetir
            el proceso hasta llegar a $0.
          </p>
          <Button onClick={() => onPayOrder?.()} disabled={disabled || !onPayOrder}>
            Ingresar monto y cobrar
          </Button>
        </section>
      ) : null}

      {method !== null && unassignedUnits > 0 ? (
        <div className={styles.footerAction}>
          <Button variant="secondary" onClick={onAttemptClose} disabled={disabled}>
            Revisar cierre de mesa
          </Button>
        </div>
      ) : null}

      {createOpen ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={() => setCreateOpen(false)}
        >
          <section
            className={styles.createModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-person-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Nueva cuenta</p>
                <h3 id="create-person-title">Agregar persona</h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                aria-label="Cerrar creación de cuenta"
              >
                ×
              </button>
            </div>
            <div className={styles.creationPaths}>
              <label className={styles.selectField}>
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
                onClick={() => {
                  onCreateCustomerAccount();
                  setCreateOpen(false);
                }}
                disabled={disabled || selectedCustomerId.length === 0}
              >
                Crear cuenta de cliente
              </Button>
              <div className={styles.or}>
                <span>o</span>
              </div>
              <Input
                label="Cuenta con nombre libre"
                value={freeName}
                onChange={onFreeNameChange}
                placeholder="Juan P."
              />
              <Button
                variant="secondary"
                onClick={() => {
                  onCreateFreeNameAccount();
                  setCreateOpen(false);
                }}
                disabled={disabled || freeName.trim().length === 0}
              >
                Crear cuenta libre
              </Button>
            </div>
          </section>
        </div>
      ) : null}

      {removeAccount ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={closeRemoveDialog}>
          <section
            className={styles.confirmModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-person-title"
            aria-describedby="remove-person-description"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Quitar de la división</p>
                <h3 id="remove-person-title">
                  {removeUnits > 0
                    ? `${removeAccount.ownerLabel}: tiene productos asignados`
                    : "¿Eliminar a esta persona?"}
                </h3>
              </div>
              <button type="button" onClick={closeRemoveDialog} aria-label="Cerrar confirmación">
                <Icon name="close" size={20} />
              </button>
            </div>
            <p id="remove-person-description">
              {removeUnits > 0
                ? "Al quitarla, sus productos volverán a la lista de productos sin asignar."
                : "Se eliminará de la división de la cuenta."}
            </p>
            {removeUnits > 0 ? (
              <p className={styles.reassignmentSummary}>
                <strong>{removeUnits} unidad(es)</strong> · <PriceTag cents={removeValue} />{" "}
                volverán a Sin asignar
              </p>
            ) : null}
            <div className={styles.confirmActions}>
              <button type="button" className={styles.cancelButton} onClick={closeRemoveDialog}>
                Cancelar
              </button>
              <button
                ref={removeConfirmRef}
                type="button"
                className={styles.destructiveButton}
                onClick={confirmRemoveAccount}
              >
                {removeUnits > 0 ? "Eliminar y devolver productos" : "Eliminar persona"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {detailsAccount ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={() => setDetailsAccountId(null)}
        >
          <section
            className={styles.createModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-details-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Historial de pagos</p>
                <h3 id="payment-details-title">{detailsAccount.ownerLabel}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailsAccountId(null)}
                aria-label="Cerrar detalle de pagos"
              >
                ×
              </button>
            </div>
            <div className={styles.paymentTotal}>
              <span>Total pagado</span>
              <PriceTag cents={detailsAccount.paidCents} />
            </div>
            <ul className={styles.paymentList}>
              {(detailsAccount.payments ?? []).map((payment) => (
                <li key={payment.id}>
                  <span>
                    <strong>{payment.methodLabel}</strong>
                    <small>{formatDate(payment.recordedAt)}</small>
                  </span>
                  <PriceTag cents={payment.amountCents} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}
