# Preserve full price for new account lines

## Goal
When a partially paid personal account receives a new product, keep the new product at its full unit price instead of redistributing historical payment across the current lines.

## Tasks
- [x] Add a regression test proving a newly added account line remains fully pending.
- [x] Allocate historical account payments to existing allocations in stable order before newer lines.
- [x] Run focused ordering and type checks.

## Evidence
- Focused ordering tests: 5 passed.
- Web TypeScript build: passed.
- `git diff --check`: passed.
- Full ordering file retains one unrelated toast-duration assertion failure (`2600` expected, `1500` received).
- Commit not created; repository safety policy requires explicit user authorization.

## Scope
- `apps/web/src/features/ordering/containers/OrderTicketPanelContainer.tsx`
- `apps/web/src/features/ordering/containers/OrderTicketPanelContainer.test.tsx`

## Non-goals
- Do not change persisted payment records or account balance calculations.
- Do not change product pricing.
