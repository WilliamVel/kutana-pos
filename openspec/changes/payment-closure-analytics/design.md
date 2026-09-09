# Design: Immutable sale snapshot at payment closure

## Target model

Keep operational tables as the source of the live workflow and add closure-time history tables later:

```text
orders
  -> sales                         one immutable closure record
       -> sale_items               copied line-item snapshots
       -> sale_settlements          copied immediate payments / pending amounts
       -> sale_adjustments          future immutable corrections/refunds, not first implementation

personal_accounts -> account allocations -> sale_items attribution (optional but recommended)
customer_debt_ledger -> pending debt reference and later collections
users -> sales.closed_by_user_id    required after user management ships first
```

`orders`, `payments`, and the debt ledger remain operational/audit records. `sales` becomes the stable analytical fact root, not a mutable mirror of the order.

## Currency and money model

Use USD as the current currency while keeping the model adaptable:

- Store all monetary amounts as integer minor units (`*_cents`) for USD.
- Store `currency_code` on the sale root using ISO-style codes; current value is `USD`.
- Do not use floating-point monetary columns.
- Display USD with two decimal places only at presentation/API formatting boundaries.
- Keep calculations currency-aware so a future currency can define its own minor-unit exponent if needed.
- Historical rows must keep their original currency code and integer amounts even if the product later supports another currency.

## Rounding and precision policy

Use exact decimal arithmetic for all closure calculations. Quantity, unit price, tax, and future discount intermediates may retain calculation precision until the agreed monetary output boundary. At persistence/API boundaries, monetary results are emitted as integer minor units and USD presentation uses two decimal places.

When a value must be rounded to cents, use decimal half-up as this system's explicit deterministic rule. This is an application policy chosen for practical SRI-compatible output: SRI technical material defines precision and formatting expectations, but does not by itself make half-up a universal rounding algorithm.

Apply the policy consistently to line-item totals, tax, discounts when they exist, sale totals, and settlement reconciliation. Any future currency support must define its exponent and rounding boundary explicitly instead of reusing USD assumptions implicitly.

## Proposed tables

### `sales` (extend existing table)

Keep the existing columns and add only values that describe the closure event:

- `order_id` unique foreign key
- `public_uuid` stable external/reporting identifier
- `opened_at` and `closed_at` snapshots
- `table_id` and nullable `customer_id` snapshots/references
- `closed_by_user_id` required once analytics implementation ships; user management must be delivered first so sale closure has an authenticated operator
- `subtotal_cents`, `tax_total_cents`, `discount_cents` (zero until discounts exist), `total_cents`
- `paid_cents`, `pending_cents`
- `status` (`paid` or `closed_with_pending`)
- `currency_code` (current value `USD`)
- `created_at`

The existing `completed_at` can remain as the closure timestamp, but naming must be standardized before migration.

### `sale_items`

One row per historical line item (or per attributed account split if attribution is required by reports):

- `id`, `sale_id`, `source_line_item_id`
- `product_id` nullable if products can eventually be removed
- `name_snapshot`, `sku_snapshot`
- `quantity`, `unit_price_cents`, `subtotal_cents`
- `discount_cents` with zero default until discounts exist
- `tax_rate_bp`, `tax_cents`, `total_cents`
- `pour_size_ml`, `is_adjustment`
- `customer_id` nullable and `account_id` nullable when responsibility is known
- `created_at`

Product name, SKU, price, tax, discount, and quantity must be copied. Reports must not depend on joining the current `products` row.

### `sale_settlements`

A closure-time financial breakdown:

- `id`, `sale_id`
- `kind`: `payment` or `pending_debt`
- `payment_id` nullable for a pending-debt row
- `account_id` nullable
- `customer_id` nullable
- `payment_method_code` nullable for pending debt
- `payment_method_label_snapshot` nullable
- `amount_cents`
- `tendered_cents`, `change_cents` for cash where applicable
- `recorded_at`

A later payment against `customer_debt` is not a new sale settlement. It should remain in `payments` and `customer_debt_ledger`, linked to the original pending account/sale through a stable reference if collection traceability is needed.

### Future `sale_adjustments`

Refunds are deferred from the first implementation. Preserve a future immutable correction path rather than editing historical sale rows:

- `id`, `sale_id`
- `kind`: `correction`, `refund`, or another explicit adjustment type decided later
- signed integer amount fields in the original sale currency
- reason/audit metadata
- `created_by_user_id` backed by the persisted user model
- `created_at`

These records would adjust analytics through separate facts, not by mutating `sales`, `sale_items`, or `sale_settlements`.

## User-management prerequisite

Payment-closure analytics depends on a separate user-management workstream that must be implemented first:

- Persist users before payment-closure analytics implementation so non-null closure operator attribution can be required from the first analytics slice.
- Define admin/operator roles.
- Add an admin-only user-management view.
- Enforce admin-only API authorization for user creation, role changes, deactivation, and related management operations.
- Record `closed_by_user_id` on sale closure once authenticated operators exist.
- Audit role changes and user deactivation because they affect the meaning of historical closure attribution.

Until that workstream exists, payment-closure analytics implementation should not ship. The future closure flow must require a persisted authenticated operator and must not invent operator identity from an unauthenticated UI session.

## Discounts, tips, and refunds

- Discounts: supported as future fields on sale roots/items with zero defaults until the product implements discount behavior.
- Tips: explicitly excluded from sale-history traceability and product revenue reconciliation. If tips are ever supported, they should use a separate model from product sales.
- Refunds: deferred. Future refund/correction behavior must be represented by immutable adjustment records instead of changing original sale facts.

## Invariants

1. One `sales` row per order (`UNIQUE(order_id)`).
2. Sale history tables are append-only: no update/delete paths for business data.
3. `total_cents = sum(sale_items.total_cents)` after the explicit decimal half-up rounding policy.
4. `paid_cents + pending_cents = total_cents` for a closed sale.
5. Every settlement references the sale and has a positive integer amount.
6. `pending_debt` requires an identified customer or remains explicitly unlinked; it must never be silently assigned to another customer.
7. Cash records satisfy `tendered_cents >= amount_cents` and `change_cents = tendered_cents - amount_cents`.
8. Closure can be retried safely: existing `sales.order_id` returns the prior result or produces a conflict if the snapshot differs.
9. The snapshot uses integer minor units and an explicit currency; no floating-point monetary columns.
10. Current USD presentation uses two decimal places.
11. Discounts default to zero until implemented and are included in total reconciliation when present.
12. Tips are not included in sale totals, settlement reconciliation, or traceability for this model.
13. Corrections/refunds are represented by future immutable adjustment records, not updates to original sale history.
14. Operator attribution uses a persisted authenticated user reference; payment-closure analytics implementation waits for user management so this value can be required.

## Closure transaction

The future application service should execute these steps on one PostgreSQL transaction:

1. Lock the order and its accounts/allocations for update.
2. Validate the order is closable: all quantities assigned and each account is paid or explicitly pending.
3. Calculate totals from immutable line-item snapshots and allocation rules using exact decimal arithmetic, then emit monetary results as integer USD cents using decimal half-up.
4. Apply discount fields as zero unless discount behavior exists.
5. Record any required customer debt debit entries, idempotently tied to the account/sale operation.
6. Insert `sales` using `order_id` as the idempotency key.
7. Insert `sale_items` and `sale_settlements`.
8. Attribute the closure to the authenticated operator; this step is required because user management ships first.
9. Mark the order and related accounts closed using their existing optimistic versions.
10. Commit; rollback everything on any failure.

The exact SQL transaction boundary should live in the API adapter/application service, not in `packages/shared`. The shared package should own calculation and validation only.

## Retention, privacy, and correction defaults

Use these pragmatic defaults for the first implementation design:

- Retention: retain immutable sale history indefinitely as financial/audit evidence unless a later compliance decision says otherwise.
- Privacy: store stable references and minimal closure-time labels needed for analytics/reconciliation; do not copy unnecessary personal data into sale history.
- Customer changes: future customer edits must not rewrite historical sale facts.
- Customer deletion/export: privacy policy may be addressed later; prefer preserving immutable financial facts with stable references and minimal personal-data snapshots over destructive rewrites.
- Corrections: use future append-only adjustment facts for refund/correction workflows.
- User audit: role changes, deactivation, and admin user-management actions require audit treatment in the separate user-management workstream.

## Future query shape

Start with normalized tables and add views/read models when reports arrive:

- daily revenue: `sales.closed_at`, `sales.total_cents`, `sales.currency_code`
- product mix: `sale_items.product_id/name_snapshot`, quantity and totals
- payment mix: `sale_settlements.payment_method_code`, amount
- pending exposure: `sale_settlements.kind = 'pending_debt'` plus the debt ledger
- customer history: customer snapshot/reference and attributed sale items
- operator history: `sales.closed_by_user_id` from the required authenticated operator

Do not use `orders.status` alone as the analytics fact: operational data can be queried during a workflow and does not contain the closure snapshot.

## Decisions still required before implementation

- Define the exact future immutable adjustment schema for corrections/refunds.
- Finalize privacy/export/deletion behavior later only if minimal personal data in immutable financial history is not sufficient.
