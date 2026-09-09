# Proposal: Immutable payment-closure history for future analytics

## Decision summary

The current PostgreSQL schema can persist the operational pieces needed to start this feature: orders, immutable line-item snapshots, personal accounts, payments, payment methods, customer debt, and a `sales` record. However, it does **not yet reliably produce a complete historical sale at closure**: `sales` has no adapter/use case, no sale-item snapshot, no payment snapshot, and no atomic closure transaction.

Confirmed planning decisions for the future implementation:

- Use USD as the current currency, stored as integer minor units (`*_cents`) and displayed with two decimal places.
- Keep the currency model adaptable by storing an explicit currency code and avoiding floating-point monetary values.
- Preserve sale, account, customer, and item attribution where available.
- Support discount fields in the future history model, while defaulting them to zero until discounts exist.
- Exclude tips from this traceability model; tips are not product revenue and are not part of sale-history reconciliation.
- Defer refunds from the first implementation while preserving a future immutable correction/adjustment path.
- Treat persisted user management as a prerequisite workstream that must ship before payment-closure analytics implementation so every sale closure can require an authenticated operator.

This change documents the target design only. It does not add tables, migrations, endpoints, UI, or reporting.

## Business outcome

Whenever an order is successfully closed, the system must preserve an immutable historical record that can later answer questions such as:

- What was sold, in what quantity, and at what price/tax/discount snapshot?
- When and from which table/order did the sale originate?
- How much was paid immediately, by which methods?
- How much became customer or unlinked pending debt?
- Which customer or personal account was responsible for each amount?
- Which authenticated operator closed the sale?

Historical records must remain useful even if catalog prices, customer data, payment-method labels, operator display names, or operational screens change later.

## Scope

### In scope for the future implementation

- Create one immutable sale history record per closed order.
- Persist sale line-item snapshots.
- Persist the payment/settlement breakdown known at closure.
- Distinguish immediate payment from pending debt.
- Preserve customer/account/item attribution where available.
- Store USD monetary values as integer minor units with two-decimal USD display.
- Store an explicit currency code so the model can adapt later without changing historical meaning.
- Include discount fields as zero/default-supported fields for future discount behavior.
- Make closure and history creation atomic and idempotent.
- Provide read-only ports for future analytics/reporting.
- Require authenticated operator attribution after the user-management prerequisite is delivered first.

### Prerequisite / separate workstream

User management is a separate prerequisite for complete closure traceability and audit controls:

- Persist authenticated users.
- Support admin and operator roles.
- Add an admin-only user-management view.
- Enforce API authorization for admin-only user-management operations.
- Attribute each closure to the operator who performed it.
- Define audit implications for user creation, role changes, deactivation, and closure attribution.

Payment-closure analytics can be planned now, but implementation must wait for this workstream so sale closure can require an authenticated operator instead of nullable or inferred operator identity.

### Out of scope

- Building dashboards or reports now.
- Invoicing, fiscal reporting, receipts, or external payment-provider reconciliation.
- Replacing the existing operational payment flow in this design slice.
- Automatically merging free-name accounts into customers.
- Capturing card-provider authorization data before a provider is selected.
- Tracking tips in sale-history traceability.
- Implementing refunds in the first history model.
- Implementing migrations, application code, UI code, or authorization changes in this planning slice.

## Current database assessment

| Existing structure | Assessment |
|---|---|
| `orders` | Has lifecycle, table, customer, opened/closed timestamps, and `closed_with_pending`. Good source aggregate. |
| `line_items` | Stores product name, unit price, quantity, tax, total, and creation time. Good source snapshot; sale history should still copy the values. |
| `payments` | Append-only and supports account/customer-debt/ticket targets plus method and cash change. Good audit source, but not a closure snapshot. |
| `payment_methods` | Runtime catalog with stable code. Persist code; copy label into history if reports must survive label changes. |
| `personal_accounts` and allocations | Preserve responsibility and quantity attribution. Need a closure-time read/snapshot. |
| `customer_debt_ledger` | Correct append-only model for identified-customer balances. Debt creation and sale closure must be coordinated. |
| `sales` | Already has a useful immutable root (`public_uuid`, order, completion time, total, tax, customer), but is incomplete for analytics and has no observed creation path/adapter. |
| Users/auth | Persisted users, roles, admin-only management, and operator attribution are not part of this change and must be handled as a prerequisite/separate workstream. |

## Pragmatic defaults

Based on the current schema and the planning decisions above, use these defaults unless later product decisions override them:

- Currency: USD for current operations; store `currency_code = 'USD'` and integer cents.
- Display: format USD with two decimal places at presentation boundaries only.
- Discounts: include `discount_cents`/discount snapshot fields with a zero default; no discount behavior is implemented by this change.
- Tips: exclude from sale-history traceability and product revenue reconciliation.
- Refunds/corrections: no refund workflow in the first model; future corrections should be immutable adjustment records tied to the original sale rather than edits to sale history.
- Retention: retain sale history, settlements, and attribution indefinitely by default because they are financial/audit records.
- Privacy: preserve stable customer/account references and closure-time labels needed for reconciliation; avoid copying unnecessary personal data into sale history.
- Export/deletion: customer export/deletion privacy policy may be addressed later; immutable financial records should retain only stable references or minimal personal-data snapshots needed for audit/reconciliation rather than destructive historical rewrites.

## Rounding and precision policy

Use a practical SRI-compatible monetary policy for the future implementation:

- Perform calculations with exact decimal arithmetic, not binary floating point.
- Retain calculation precision for quantity, unit price, tax, and discount intermediates until the defined monetary output boundary.
- Emit stored/API monetary results as integer minor units and present USD monetary values at two decimals.
- Use decimal half-up rounding as the system's explicit deterministic rule whenever a value must be rounded to cents.
- Document this as an application policy: SRI technical material specifies precision and output format expectations, but does not itself establish decimal half-up as a universal rounding algorithm.

## Main conclusion

We should extend the schema in a later implementation slice rather than create a separate analytics database now. PostgreSQL is sufficient for the first analytics history model if closure writes an immutable, normalized snapshot in one transaction. A warehouse/event-stream can be considered only when volume or cross-location reporting justifies it.

## Acceptance criteria for implementation

- A successful closure creates exactly one sale history root.
- A retried closure does not duplicate the sale.
- A failed closure leaves no partial sale history or debt ledger entries.
- Closed sale history is immutable and independent of future catalog, customer, user, or payment-method changes.
- A sale with pending debt records the pending amount without treating later debt collection as new product revenue.
- Every recorded settlement can be reconciled to the sale total, with explicit handling of cash change and rounding.
- Monetary values are stored as integer minor units with an explicit currency code.
- Current USD display uses two decimal places.
- Closure attribution records a persisted authenticated operator; payment-closure analytics implementation starts only after user management makes that requirement enforceable.

## Decisions still remaining

- Exact customer privacy/export/deletion behavior for immutable financial records; policy may be addressed later if sale history keeps personal data minimal.
- Exact future shape for immutable correction/adjustment records.
