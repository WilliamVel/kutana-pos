# Generalize numeric input editing

## Goal
Make quantity and monetary numeric fields intuitive to edit by preserving the user's in-progress text and validating only at the appropriate boundary.

## Tasks
- [x] Introduce a reusable raw-draft numeric input pattern without breaking existing numeric callbacks.
- [x] Apply the pattern to catalog stock/price fields, register payment fields, and split-bill quantities.
- [x] Add focused regression tests for clearing, intermediate decimals, multi-digit quantities, bounds, and submission values.
- [x] Run focused web tests and review the final diff.
- [x] Normalize comma-decimal input from mobile keyboards and use text inputs where native number controls reject localized separators.

## Scope
- `apps/web/src/design-system/atoms/Input.tsx`
- `apps/web/src/features/catalog/components/ProductForm.tsx`
- `apps/web/src/features/catalog/components/ProductForm.test.tsx`
- `apps/web/src/features/register/components/RegisterPaymentPanel.tsx`
- `apps/web/src/features/register/components/RegisterPaymentPanel.test.tsx`
- `apps/web/src/features/split-bill/components/SplitBillView.tsx`
- `apps/web/src/features/split-bill/components/SplitBillView.test.tsx`
- `apps/web/src/features/pending-debts/components/PendingDebtsView.tsx`

## Constraints
- Preserve domain callback types and persistence contracts.
- Keep validation and bounds enforcement at submit/commit boundaries, while allowing temporary editing states.
- Preserve existing locale and currency behavior unless required for consistent editing.
- Do not change non-numeric fields.

## Evidence
- Investigation confirmed parse-and-format-on-every-keystroke in catalog and register, and immediate clamping in split-bill.
- Pending-debts raw string drafts provide the existing project pattern to extend consistently.
- Focused tests: 3 files, 42 tests passed.
- Web typecheck passed.
- Full web suite: 66 files, 310 tests passed.
- `git diff --check` passed for the authorized feature paths.
- Comma-decimal fix: focused 26 tests passed and web typecheck passed.
- Existing React `act(...)` warnings remain; no test failures.
- Work-unit commit: `0605f39 fix(web): support intuitive localized numeric input`.
- Pushed to `origin/main`.

