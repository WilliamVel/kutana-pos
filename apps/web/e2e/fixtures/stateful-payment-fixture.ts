import { expect, type Page } from "@playwright/test";

export const paymentFixtureSession = {
  operatorId: "operator-e2e",
  displayName: "E2E Operator",
  role: "admin",
  token: "e2e-token",
  expiresAt: "2099-01-01T00:00:00.000Z",
  refreshToken: "e2e-refresh-token",
  refreshExpiresAt: "2099-01-08T00:00:00.000Z",
};

export const paymentFixtureTable = {
  id: "table-partial-payment",
  label: "Mesa pago parcial",
  status: "active",
  currentOrderId: "order-partial-payment",
  version: 1,
};

export const paymentFixtureOrder = {
  id: paymentFixtureTable.currentOrderId,
  tableId: paymentFixtureTable.id,
  status: "active",
  openedAt: "2025-01-01T10:00:00.000Z",
  closedAt: null,
  customerId: null,
  version: 1,
  lineItems: [
    {
      id: "line-partial-beer",
      orderId: paymentFixtureTable.currentOrderId,
      productId: "product-beer",
      nameSnapshot: "KUTANA Pilsener 500ml",
      unitPriceCents: 350,
      quantity: 2,
      pourSizeMl: 500,
      taxRateBp: 1200,
      taxCents: 84,
      totalCents: 784,
      isAdjustment: false,
      createdAt: "2025-01-01T10:00:00.000Z",
    },
    {
      id: "line-partial-nachos",
      orderId: paymentFixtureTable.currentOrderId,
      productId: "product-nachos",
      nameSnapshot: "Loaded Nachos",
      unitPriceCents: 650,
      quantity: 1,
      pourSizeMl: null,
      taxRateBp: 1200,
      taxCents: 78,
      totalCents: 728,
      isAdjustment: false,
      createdAt: "2025-01-01T10:01:00.000Z",
    },
  ],
} as const;

export async function installStatefulPaymentFixture(page: Page): Promise<void> {
  const state = {
    accounts: [
      {
        id: "account-first",
        orderId: paymentFixtureOrder.id,
        owner: { kind: "free_name", freeName: "Primera cuenta" },
        status: "open",
        createdAt: "2025-01-01T10:02:00.000Z",
        closedAt: null,
        version: 1,
      },
      {
        id: "account-second",
        orderId: paymentFixtureOrder.id,
        owner: { kind: "free_name", freeName: "Segunda cuenta" },
        status: "open",
        createdAt: "2025-01-01T10:03:00.000Z",
        closedAt: null,
        version: 1,
      },
    ],
    allocations: [
      {
        id: "allocation-first-beer",
        accountId: "account-first",
        lineItemId: "line-partial-beer",
        quantity: 1,
      },
    ],
    payments: [] as Array<Record<string, unknown>>,
  };

  await page.addInitScript((session) => {
    localStorage.setItem("kutana.auth.session", JSON.stringify(session));
  }, paymentFixtureSession);

  await page.route("http://localhost:3000/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    let body: unknown = [];

    if (path === "/ordering/tables") body = [paymentFixtureTable];
    else if (path === `/ordering/tables/${paymentFixtureTable.id}`) body = paymentFixtureTable;
    else if (path === "/ordering/orders") body = paymentFixtureOrder;
    else if (path === "/billing/customers") body = [];
    else if (path === "/billing/personal-accounts" && request.method() === "GET")
      body = state.accounts;
    else if (path === `/billing/personal-accounts/account-first` && request.method() === "GET") {
      body = state.accounts[0];
    } else if (path === `/billing/orders/${paymentFixtureOrder.id}/account-line-allocations`) {
      body = state.allocations;
    } else if (path === "/payments/methods") {
      body = [
        { code: "CASH", label: "Efectivo", active: true, requiresTendered: true },
        { code: "BANK_TRANSFER", label: "Transferencia", active: true, requiresTendered: false },
        { code: "QR_PAYMENT", label: "Pago QR", active: true, requiresTendered: false },
      ];
    } else if (path === "/payments" && request.method() === "GET") {
      const accountId = url.searchParams.get("accountId");
      body = state.payments.filter(
        (payment) =>
          payment.target && (payment.target as { accountId?: string }).accountId === accountId,
      );
    } else if (path === "/payments" && request.method() === "POST") {
      const payment = request.postDataJSON() as Record<string, unknown>;
      state.payments.push(payment);
      body = payment;
    } else if (path.startsWith("/billing/personal-accounts/") && request.method() === "PUT") {
      const payload = request.postDataJSON() as {
        account: (typeof state.accounts)[number];
        allocations: typeof state.allocations;
      };
      let index = state.accounts.findIndex((account) => account.id === payload.account.id);
      if (index >= 0) {
        state.accounts[index] = { ...payload.account, version: payload.account.version + 1 };
      } else {
        state.accounts.push({ ...payload.account, version: payload.account.version + 1 });
        index = state.accounts.length - 1;
      }
      state.allocations = payload.allocations;
      body = state.accounts[index];
    } else if (path === "/categories") body = [];
    else if (path === "/products") body = [];
    else if (path === "/payment-closures") body = {};

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

export async function expectMainOrderView(page: Page): Promise<void> {
  await expect(
    page.locator(`section[aria-label="Resumen de orden para ${paymentFixtureTable.label}"]`),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Pagar mesa completa" })).toBeVisible();
}
