# Tasks: Payment-closure analytics history

Planning only. Do not implement until the proposal/design and open decisions are approved.

## Phase 0 — Decisions

- [x] Confirm current currency: USD.
- [x] Confirm money representation: integer minor units (`*_cents`) and two-decimal USD display at presentation boundaries.
- [x] Confirm the model should remain adaptable through explicit `currency_code` storage.
- [x] Confirm sale/account/customer/item attribution should be retained where available.
- [x] Confirm discounts are supported as future fields with zero defaults until implemented.
- [x] Confirm tips are excluded from payment-closure traceability.
- [x] Confirm refunds are deferred while preserving a future immutable correction/adjustment path.
- [x] Confirm user management is a prerequisite/separate workstream for operator attribution and auditability.
- [x] Define the rounding policy: exact decimal arithmetic, retained calculation precision for quantity/unit price/tax/discount intermediates, monetary output at two decimals/integer cents, and decimal half-up as the application's deterministic rule.
- [x] Confirm register and shift attribution are not included for now.
- [x] Confirm user management must be implemented before payment-closure analytics so sale closure can require an authenticated operator.
- [ ] Finalize correction policies.
- [ ] Define any later customer export/deletion privacy policy if minimal personal data in immutable financial history is not sufficient.

## Phase 0a — User-management prerequisite / separate workstream

- [ ] Persist authenticated users.
- [ ] Define admin and operator roles.
- [ ] Add an admin-only user-management view.
- [ ] Enforce API authorization for admin-only user-management operations.
- [ ] Add audit treatment for user creation, role changes, deactivation, and related admin actions.
- [ ] Expose authenticated operator identity to the future closure flow.
- [x] Require this workstream to ship before payment-closure analytics so `closed_by_user_id` can be required for closed sales.

## Phase 1 — Domain and contracts

- [ ] Add a closure-history model and pure snapshot calculation in `packages/shared`.
- [ ] Represent monetary values as integer minor units with explicit currency code; default current currency to USD.
- [ ] Add tests for totals, payment/pending reconciliation, cash change, decimal half-up rounding, and account/customer/item attribution.
- [ ] Include discount fields in calculations with zero defaults until discounts exist.
- [ ] Exclude tips from sale total reconciliation and traceability.
- [ ] Define an idempotent `SaleRepository`/closure port contract.
- [ ] Define behavior for retrying an already closed order.
- [ ] Define a future immutable adjustment/correction contract for refunds without implementing refund behavior in the first slice.

## Phase 2 — PostgreSQL persistence

- [ ] Add forward-only migrations for `sales` extensions, `sale_items`, and `sale_settlements`.
- [ ] Add `currency_code`, integer cent amount fields, discount fields, and required operator attribution backed by the user-management prerequisite.
- [ ] Add immutable triggers and constraints for historical tables.
- [ ] Implement the missing Postgres sale repository/adapter.
- [ ] Add indexes for closure date, product, payment method, customer, account, pending status, and future operator attribution.
- [ ] Add an integration test proving a failed transaction leaves no partial history/debt.

## Phase 3 — Atomic closure flow

- [ ] Implement one transactional application service for validation, debt creation, sale snapshot, and order closure.
- [ ] Add idempotency protection based on `sales.order_id`.
- [ ] Ensure later customer-debt payments do not create duplicate sales revenue.
- [ ] Reconcile sale totals against line items and settlements using integer cents.
- [ ] Apply current USD display formatting only outside persistence/calculation boundaries.
- [ ] Require and record authenticated operator attribution, relying on the user-management prerequisite shipped first.

## Phase 4 — Read models (later)

- [ ] Add read-only queries for daily sales, product mix, payment mix, pending exposure, customer/account attribution, and operator history.
- [ ] Add reporting tests with closed sales and pending debt examples.
- [ ] Only then decide whether a materialized view, export, or analytics warehouse is justified.

## Phase 5 — Future corrections/refunds (later)

- [ ] Design immutable sale adjustment records for corrections/refunds.
- [ ] Ensure adjustment facts do not mutate original sale, item, or settlement history.
- [ ] Include operator/admin audit attribution backed by the prerequisite user-management model.

## Explicit non-work in this slice

- No migration or application code.
- No dashboard.
- No external payment integration.
- No automatic customer matching.
- No tip traceability.
- No refund implementation.
- No user-management implementation in this change; user management is a separate prerequisite that must be completed before payment-closure analytics implementation.
