# Sales analytics v1

## Objective
Deliver a reliable first sales analytics experience for web and mobile based only on immutable closed-sale facts, with clear definitions, business-local day attribution, accessible responsive UI, and a verified partial-payment closure path.

## Definitions and decisions
- Closed sales = SUM(sales.total_cents), tax included.
- Closed orders = COUNT(sales) (do not call these tickets).
- Average per order = closed sales / closed orders; show an explicit zero-orders state.
- Collected at close = SUM(sales.paid_cents), reconciled to SUM(sale_settlements.amount_cents); never add it to sales.
- Pending at close = historical sales.pending_cents.
- Current outstanding balance is operational Accounts Receivable, not a historical analytics metric; link to that screen rather than label pending exposure as current.
- Commercial day uses sales.completed_at in America/Guayaquil, including inclusive date bounds and daily grouping. Keep the timezone localized for future configuration.
- Excluded: margin, liters, base beer grouping, historical categories, tips, refunds, and estimated metrics.

## Tasks
- [ ] SA-1: Correct partial-payment closure inputs and add real closure regression coverage for paid + pending = total and settlements = paid.
- [ ] SA-2: Add a summary contract/service with effective period, timezone, currency, summary metrics, daily zero-filled series, and reconciliation tests.
- [ ] SA-3: Redesign responsive analytics UI with summary-first hierarchy, readable payment labels, product performance ordering/presentation, explicit filter apply/loading/error/empty states, and accessible tables.
- [ ] SA-4: Add bounded performance safeguards (period limit, Top N/detail affordance, aligned completed_at index if needed), run focused/full verification, and document outcomes.

## Progress
- Research document and current implementation were contrasted before edits. Research is accurate about four independent analytics requests, missing timezone configuration, payment-label gap, and the partial-payment risk; current code also had a closure bug where `items`/paid/pending values were not consistently passed into the immutable snapshot.
- SA-1 through SA-4 implemented without a commit because the user did not authorize repository commits.
- Engram mirror unavailable due provider version mismatch.

## Checks
- Focused verification: 5 files / 25 tests passed, including partial-payment closure, analytics aggregation, web analytics, and migration discovery.
- `pnpm typecheck` passed.
- `pnpm lint` passed.
- Added explicit timezone/range-bound assertions and migration 021 for `completed_at`.
- Browser visual/layout checks were not run in this session; CSS uses responsive grid and horizontal table overflow.

## Commits
- None: commit authorization was not provided.
