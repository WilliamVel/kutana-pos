# Simplify register payment amount

## Goal
Remove the editable duplicate `Monto a cobrar` control from the register payment screen. Show the current context's due amount as read-only, while keeping `Efectivo recibido` as the only cashier-entered monetary amount for cash payments.

## Domain evidence
- `remainingBalanceCents` is the amount due for the current payment context (selected products, ticket, account, or whole table), after prior payments.
- `amountToPayCents` is currently editable and supports partial payment allocation.
- User explicitly accepted removing partial-payment entry from this screen; the UI should apply the full current remaining balance.
- Payment calculations, persisted fields, allocation IDs, and backend contracts must not change.

## Constraints
- Preserve payment method registry behavior and cash/non-cash branching.
- Keep cash validation and change calculation based on the applied amount.
- Avoid touching unrelated existing worktree changes.
- Technical artifacts remain in English; product UI copy remains Spanish.

## Tasks
1. Replace the editable amount control with the existing `Saldo pendiente` due summary and adjust payment panel hierarchy/accessibility. Status: done. Route: delegated writer (multi-file implementation). Surfaces: register payment panel TSX/CSS.
2. Update focused register payment tests for the removed amount control and cash states. Status: done. Route: delegated writer.
3. Run focused web tests and typecheck; inspect diff for unchanged payment contracts. Status: done. Route: delegated verifier, then parent spot-check.

## Verification
- `pnpm vitest run apps/web/src/features/register/components/RegisterPaymentPanel.test.tsx apps/web/src/features/register/containers/RegisterPaymentContainer.test.tsx --no-file-parallelism`
- `pnpm typecheck`

## Delivery
- No commit requested by user; no commit created.
- Existing unrelated modifications are pre-existing and remain untouched.
- Forecast: under 400 authored changed lines; single work unit.
- Evidence: writer and verifier both report 21 focused tests passed, typecheck passed, and `git diff --check` passed; verifier confirmed no `Monto a cobrar` rendering and unchanged payment contracts.
