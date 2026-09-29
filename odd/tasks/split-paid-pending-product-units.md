# Split paid and pending product units

## Goal
Make Pendientes/Pagados show the actual visible unit quantities and row totals while keeping the order summary global and preserving payment allocation contracts.

## Tasks
- [x] Derive separate paid/pending visual rows from aggregated product lines.
- [x] Update tabs, labels, selection behavior, and global summary copy.
- [x] Add regression coverage for split quantities, sub-unit payments, and global totals.
- [x] Run focused web checks and commit the work unit.

## Scope
- Ordering ticket panel view model, component, styles, and focused tests.
- No persisted line, allocation, account, or payment contract changes.

## Non-goals
- Do not change backend/accounting allocation math.
- Do not treat a sub-unit proportional payment as a paid product unit.

## Evidence
- Focused ordering/container/line-item/aggregation tests: 31 passed before final selection regression; 23 passed after final selection and lint fixes.
- Full suite: 528 passed, 59 skipped because `DATABASE_URL` was unavailable.
- `pnpm typecheck`: passed.
- Focused ESLint: passed after removing unused allocation binding.
- `git diff --check`: passed.
- Selection regression confirms duplicate paid/pending presentation IDs resolve to the pending segment for review amounts.
