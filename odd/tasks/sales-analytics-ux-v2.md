# Sales analytics UX v2

## Objective
Keep sales analytics concise as history grows while enabling accessible exploration of complete daily and product detail without changing established financial definitions or reconciliations.

## Constraints and decisions
- Preserve closed sales, closed orders, average order, collected at close, historical pending at close, and current Accounts Receivable separation.
- Keep `completed_at` and `America/Guayaquil` semantics unchanged.
- Initial view uses a bounded period; all history is explicit.
- Summary product list is Top 5 only; product detail searches/paginates server-side across all sold products.
- Stable tie-breaks: revenue desc then name asc then product id asc; quantity desc then name asc then product id asc.
- Presentation is shown only from persisted historical data; no inference from name/SKU.

## Tasks
- [ ] UX-1: Extend analytics contracts/API for bounded periods, product search/sort/pagination, and paginated daily detail while preserving summary reconciliation.
- [ ] UX-2: Redesign analytics screen with quick periods, compact trend, progressive detail views, product search/order/pagination, and accessible states.
- [ ] UX-3: Add representative fixtures/tests for products beyond Top 10, pagination resets, reconciliation stability, and responsive visual behavior.
- [ ] UX-4: Verify web/mobile visual tests, focused tests, typecheck, and lint.

## Evidence
- Current API exposes only unpaginated `productMix` and summary loads all details; UI displays a long daily table and slices products client-side.
- Current product query returns `presentationSize` as NULL; the UI must omit that column when all rows are empty.
- Existing responsive Playwright test infrastructure runs from `apps/web` against Vite preview.

## Progress
- ✅ Added server-side product detail endpoint with search, stable sort, page, page size, and total count; summary now uses Top 5.
- ✅ Added paginated daily detail endpoint and compact trend aggregation for long periods.
- ✅ Added quick periods with bounded initial 30-day range, explicit all-history choice, compact trend, progressive product/daily detail, accessible states, and responsive layout.
- ✅ Added multi-page mock fixture including a product outside Top 10 and tests proving server-detail search preserves summary values.
- ✅ Verification: API analytics/controller 18 tests passed; web analytics 3 tests passed; typecheck and lint passed; Playwright suite passed with analytics checks at 1440px and 390px (14 total e2e tests ran because the package script includes the wider suite).
- No database reset, migration application, or commit was performed.
