# Fix payment tabs and partial amounts

## Goal
Center and evenly distribute the pending/paid product tabs, and show partial payment amounts from paid whole units instead of proportional allocation cents.

## Tasks
- [x] Update product payment tabs layout and payment display data.
- [x] Add regression coverage for tab layout contract and whole-unit partial amounts.
- [x] Run focused web tests and checks; record evidence and commit.

## Scope
- `apps/web/src/features/ordering/components/OrderTicketPanel.module.css`
- `apps/web/src/features/ordering/components/OrderTicketPanel.tsx`
- `apps/web/src/features/ordering/containers/OrderTicketPanelContainer.tsx`
- Related focused tests.

## Non-goals
- Do not alter persisted payment allocation or accounting totals.
- Do not change payment-detail modal amounts that represent actual allocated money.

## Evidence
- Focused ordering, line-item, and container tests: 27 passed.
- `pnpm typecheck`: passed.
- Focused ESLint: passed.
- `git diff --check`: passed.
- Product tabs now use a centered flex layout with equal-width buttons.
- Product-row partial copy derives represented paid cents from complete paid settlement units; modal details retain allocated `paidCents`.
