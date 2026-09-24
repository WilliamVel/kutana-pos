export type PendingDebtSort = "activity" | "balance";

export interface PendingCustomerDebtSummary {
  readonly customerId: string;
  readonly displayName: string;
  readonly balanceCents: number;
  readonly lastDebtAt: string;
  readonly debitCents: number;
  readonly paidCents: number;
  readonly sourceCount: number;
}

export interface PendingDebtPage {
  readonly rows: readonly PendingCustomerDebtSummary[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalRows: number;
  readonly totalPendingCents: number;
  readonly identifiedTotalCents: number;
  readonly unlinkedTotalCents: number;
}

export interface PendingDebtPageQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string;
  readonly sort?: PendingDebtSort;
}
