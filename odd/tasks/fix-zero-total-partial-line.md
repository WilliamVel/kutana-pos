# Fix zero total on partially paid line items

## Goal
Prevent pending product rows from displaying `$0.00` when they still represent an unpaid quantity.

## Tasks
- [x] Add a regression test for a partial-payment segment whose derived display balance is zero.
- [x] Fall back to the pending line total when the presentation-only balance is zero, preserving real unpaid quantity and unit price.
- [x] Run focused ordering checks and record evidence.

## Evidence
- Focused ordering regression tests: 4 passed.
- `pnpm --filter @kutana/web exec tsc -p tsconfig.json --noEmit --pretty false`: passed.
- `git diff --check`: passed.
- Full ordering file retains one unrelated existing toast-duration assertion failure (`2600` expected, `1500` received).
- Commit not created; repository safety policy requires explicit user authorization.

## Scope
- `apps/web/src/features/ordering/containers/OrderTicketPanelContainer.tsx`
- `apps/web/src/features/ordering/containers/OrderTicketPanelContainer.test.tsx`

## Non-goals
- Do not change persisted payment or allocation accounting.
- Do not alter catalog prices or settlement math.
