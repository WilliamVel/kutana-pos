# Sales analytics v1 implementation

## Applied definitions

- **Ventas cerradas**: `SUM(sales.total_cents)`, impuestos incluidos.
- **Órdenes cerradas**: `COUNT(sales)`; the UI avoids the ambiguous word “tickets”.
- **Promedio por orden**: closed sales divided by closed orders; the API returns `null` and the UI renders `—` when there are no orders.
- **Cobrado al cierre**: `SUM(sales.paid_cents)`, reconciled with sale settlements; it is never added to sales.
- **Pendiente al cierre**: immutable `sales.pending_cents`. It is not a current balance.
- **Saldo pendiente vigente**: operational Accounts Receivable; the analytics screen links to Cuentas por cobrar instead of presenting historical pending exposure as current.
- Commercial day, inclusive date bounds, and daily grouping use `sales.completed_at` in `America/Guayaquil`, explicitly in SQL. The constant is localized in the shared analytics model so a later deployment setting can replace it.

## Deliberately excluded

Margin, liters, base-beer grouping, historical categories, tips, refunds, and estimated metrics are not shown because the sale snapshot cannot calculate them reliably. Presentation size remains `null` unless it is a persisted historical fact; it is never inferred from a name or SKU.

## Implementation notes

The summary endpoint is `GET /billing/analytics/summary`. Detail endpoints remain available for compatibility. Analytics products are ordered by revenue, payment methods are joined to the runtime label registry, and the completed-at index is added by migration 021. The web filter applies explicitly rather than requesting on every keystroke; tables include captions and responsive horizontal overflow, while the main hierarchy is summary → daily trend → details.

## UX v2 exploration

The summary now requests only five products. `GET /billing/analytics/products` supports server-side date range, search, stable sort, page, page size, and total count; it is the source for the full product detail and never filters a Top-N payload in the browser. `GET /billing/analytics/daily-sales-detail` provides paginated day rows with zero-filled days. The main trend is compact and exposes an accessible text total plus a separate detail view. Since sale snapshots currently do not persist presentation size, the product detail omits the presentation column when no historical row contains one.
