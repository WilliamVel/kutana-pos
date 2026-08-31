# Design: Personal accounts and pending customer debts

## Current model constraints

The current milestone-1 domain has these relevant concepts:

- `Order` contains immutable `LineItem[]` and has status `active | needs_check | paid`.
- `Ticket` is the payable split-bill unit and has status `open | paid | void`.
- `Allocation` maps one full `LineItem` to one `Ticket` with `shareBp = 10000`.
- `Payment` targets a `ticketId` and supports multiple append-only payments.

That model is good for whole-line split bills, but insufficient for personal accounts and debts because the account owner, pending lifecycle, quantity-level allocation, and debt ledger are missing.

## Architecture decision

`PersonalAccount` becomes the primary payable unit for future ordering and payment flows.

`Ticket` and the current `Allocation.shareBp = 10000` model are milestone-1 implementation concepts only. They should not remain as a parallel domain abstraction once personal accounts are implemented. Implementation may use a temporary compatibility slice while migrating UI and mocks, but the target model is:

```text
Order
  -> PersonalAccount[]
       -> AccountLineAllocation[]
       -> Payment[]

Customer
  -> CustomerDebtEntry[]
```

Reasoning:

- Business responsibility belongs to a person or free-name account, not to an anonymous ticket.
- Pending debt is personal and can survive table closure.
- Identified customer debt accumulates across visits.
- Keeping both `Ticket` and `PersonalAccount` as first-class concepts would create duplicate payable units and long-term domain ambiguity.

## Target concepts

### Customer

A reusable person or customer record.

```ts
interface Customer {
  readonly id: string;
  readonly displayName: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
```

Customer matching/search is intentionally not a domain invariant. The domain only requires stable customer IDs once a record is selected.

### PersonalAccount

A payable responsibility group inside an order.

```ts
type PersonalAccountStatus = "open" | "partially_paid" | "pending" | "paid" | "void";

type PersonalAccountOwner =
  | { readonly kind: "customer"; readonly customerId: string }
  | { readonly kind: "free_name"; readonly freeName: string };

interface PersonalAccount {
  readonly id: string;
  readonly orderId: string;
  readonly owner: PersonalAccountOwner;
  readonly status: PersonalAccountStatus;
  readonly createdAt: string;
  readonly closedAt: string | null;
  readonly version: number;
}
```

Owner invariant: an account has exactly one owner: either an identified customer or a non-empty free-name label.

### AccountLineAllocation

Quantity-level allocation from an order line item to a personal account.

```ts
interface AccountLineAllocation {
  readonly id: string;
  readonly accountId: string;
  readonly lineItemId: string;
  readonly quantity: number;
}
```

Rules:

- Quantity must be positive.
- Quantity must use the same unit semantics as the source line item.
- Sum of allocations for a line item must not exceed the line item quantity.
- No arbitrary amount split is allowed in this change.
- Account totals are derived from allocated quantity and the source line item's unit price/tax snapshot.

### Payment

Payments should be able to target either a personal account or a customer debt collection flow.

Recommended shape:

```ts
type PaymentTarget =
  | { readonly kind: "personal_account"; readonly accountId: string }
  | { readonly kind: "customer_debt"; readonly customerId: string };

interface Payment {
  readonly id: string;
  readonly target: PaymentTarget;
  readonly methodCode: PaymentMethodCode;
  readonly amountCents: number;
  readonly tenderedCents: number | null;
  readonly changeCents: number | null;
  readonly recordedAt: string;
}
```

This supersedes the current `ticketId`-only payment target when the implementation slice happens.

### CustomerDebtEntry

Use a ledger, not a mutable balance field.

```ts
type CustomerDebtEntryKind = "pending_account" | "payment" | "adjustment";
type CustomerDebtDirection = "debit" | "credit";

interface CustomerDebtEntry {
  readonly id: string;
  readonly customerId: string;
  readonly kind: CustomerDebtEntryKind;
  readonly direction: CustomerDebtDirection;
  readonly amountCents: number;
  readonly accountId: string | null;
  readonly paymentId: string | null;
  readonly note: string | null;
  readonly createdAt: string;
}
```

Balance is derived:

```ts
balanceCents = sum(debit.amountCents) - sum(credit.amountCents)
```

Identified-customer pending accounts create debit entries. Later debt payments create credit entries. This allows multiple visits to accumulate debt without overwriting history.

### Free-name pending accounts

Free-name pending accounts are not merged automatically. They remain account-level pending records until an operator either:

- collects payment directly against that account;
- links the account to an existing customer;
- creates a new customer from the free name and links it.

This avoids accidental merges of `Juan`, `juan`, `Juan P.`, and similar ambiguous labels.

## Order lifecycle

Recommended future order statuses:

```ts
type OrderStatus = "active" | "needs_check" | "in_review" | "paid" | "closed_with_pending";
```

Semantics:

- `active`: items can be added.
- `needs_check`: payment/account resolution is underway.
- `in_review`: attempted closure found unresolved consumption.
- `paid`: all consumption is paid and no pending debt remains.
- `closed_with_pending`: all consumption is assigned/resolved, but at least one account became pending debt.

An order must not close silently when quantities are unassigned or over-assigned. The closure attempt should return a review result describing unresolved quantities.

## Resolution rules

A line item quantity is resolved when its full quantity is covered by account allocations and each owning account is in one of:

- `paid`;
- `pending`;
- another explicitly accepted review resolution if future business rules add one.

A personal account balance is:

```ts
allocatedTotalCents - paidCents
```

Status derivation:

- `open`: no payments and not pending.
- `partially_paid`: paid amount is greater than zero but below total.
- `paid`: paid amount covers total.
- `pending`: operator explicitly marks remaining balance as personal debt.

For an identified customer, marking pending emits a debt debit entry for the remaining balance. For a free-name account, it stays in the pending-account list until linked or paid.

## Pending-debts screen model

The pending-debts screen should not list orders as primary rows. It should list debts:

- identified customers grouped by customer;
- free-name pending accounts listed individually.

Suggested read model:

```ts
interface PendingCustomerDebtSummary {
  readonly customerId: string;
  readonly displayName: string;
  readonly balanceCents: number;
  readonly lastDebtAt: string;
  readonly openEntries: readonly CustomerDebtEntry[];
}

interface UnlinkedPendingAccountSummary {
  readonly accountId: string;
  readonly freeName: string;
  readonly orderId: string;
  readonly tableId: string;
  readonly remainingCents: number;
  readonly createdAt: string;
}
```

## Repository/port impact

Future implementation will likely need new ports:

- `CustomerRepository`
- `PersonalAccountRepository`
- `AccountAllocationRepository` or account methods that persist allocations transactionally
- `CustomerDebtRepository`
- extended `PaymentRepository` target support

Existing `TicketRepository` should be deprecated during the implementation slice. Do not extend it with customer/debt behavior except as a short-lived compatibility adapter needed to keep the app compiling between slices.

## Migration strategy for the current frontend-first milestone

Do not retrofit the current split-bill UI as a quick patch. Instead, migrate in reviewable slices:

1. Add the new domain model beside the current ticket implementation, with tests proving account ownership, quantity allocation, status derivation, pending debt ledger, and closure review.
2. Introduce new ports and mock repositories for customers, personal accounts, allocations, and customer debt.
3. Move payment targets from `ticketId` toward explicit payment targets.
4. Replace the split-bill screen with an account-assignment workflow.
5. Add a separate pending-debts screen.
6. Remove or isolate obsolete ticket terminology after the personal-account path covers the current behavior.

## Open risks

- Customer duplicate prevention requires product decisions about searchable fields and matching rules.
- Debt adjustments/forgiveness require permissions and audit rules not yet scoped.
- Persistence will need transactional consistency across account status, payments, and ledger entries.
- Current `Allocation.shareBp` seam was designed for fractional splitting; quantity splitting is a different seam and must be introduced carefully without mutating immutable line items.
