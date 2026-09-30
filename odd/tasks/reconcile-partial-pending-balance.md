# Reconcile partial pending balance display

## Goal
Make pending product rows show the remaining balance when an order-level payment has partially covered their units, while preserving original unit prices and global accounting totals.

## Tasks
- [x] Derive a presentation-only remaining amount for pending segments with partial allocation.
- [x] Render the remaining amount without changing selection, payment, or persisted totals.
- [x] Add regression coverage for pending quantity versus remaining balance.
- [x] Run focused checks and commit the work unit.

## Evidence
- Focused ordering/line-item tests: passed (4 regression tests; worker report).
- `pnpm typecheck`: passed.
- `git diff --check`: passed.
- Full ordering suite retains one unrelated existing toast-duration assertion failure.


## Non-goals
- Do not change account payment allocation math.
- Do not treat partial cents as a fully paid unit.
