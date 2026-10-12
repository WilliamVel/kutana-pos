# Return to order after partial split payment

## Goal
Keep split orders open and return the operator to the order-assignment screen after a partial or non-final personal-account payment. Close and remove the order only when every assigned account and line item is fully paid.

## Tasks
- [x] Separate account payment continuation from final order closure.
- [x] Route partial account payments back to split assignment and preserve final closure behavior.
- [x] Add regression coverage for partial and final account payment navigation.
- [ ] Run focused checks and record the work-unit commit.

## Follow-up correction
The first implementation covered only personal-account payments. Whole-table and legacy ticket payment branches also needed to invoke the continuation callback when `newBalance > 0`; those branches now return to the active order flow as well.

## Latest correction
The personal-account payment loader was only loading the selected account. As a result, the list of other accounts was empty and the completion check could incorrectly close the order. It now loads all order accounts and their payment history before deciding whether closure is allowed. Non-final payments now return to the main open-order view, not the split-assignment view.

## Latest evidence
- `pnpm exec vitest run --no-file-parallelism apps/web/src/features/register/containers/RegisterPaymentContainer.test.tsx` — 7 tests passed, including an account-paid/another-pending regression.
- `pnpm typecheck` — passed.
- `git diff --check` — passed.

## Evidence
- `pnpm exec vitest run --no-file-parallelism apps/web/src/features/register/containers/RegisterPaymentContainer.test.tsx apps/web/src/features/split-bill/containers/SplitBillContainer.test.tsx` — 13 tests passed.
- `pnpm typecheck` — passed.
- Work-unit commit — pending explicit user authorization; repository policy forbids committing without it.
