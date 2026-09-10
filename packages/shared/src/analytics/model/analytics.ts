export interface AnalyticsDateRange {
  readonly from?: string;
  readonly to?: string;
}

export interface DailySalesTotal {
  readonly date: string;
  readonly currencyCode: string;
  readonly totalCents: number;
}

export interface ProductMixRow {
  readonly productId: string;
  readonly name: string;
  readonly quantity: number;
  readonly revenueCents: number;
  readonly currencyCode: string;
}

export interface PaymentMixRow {
  readonly methodCode: string;
  readonly amountCents: number;
  readonly currencyCode: string;
}

export interface PendingExposureRow {
  readonly customerId: string | null;
  readonly accountId: string | null;
  readonly pendingCents: number;
  readonly currencyCode: string;
}

export interface AnalyticsSnapshot {
  readonly dailySales: readonly DailySalesTotal[];
  readonly productMix: readonly ProductMixRow[];
  readonly paymentMix: readonly PaymentMixRow[];
  readonly pendingExposure: readonly PendingExposureRow[];
}
