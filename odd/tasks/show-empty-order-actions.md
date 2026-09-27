# Show order actions when no orders exist

## Goal
Keep the existing order behavior while rendering the “Ver todas” and “Crear orden” actions when the active order list is empty.

## Tasks
- [x] Update the orders overview empty-state rendering so the existing header actions remain visible.
- [x] Add focused coverage for the empty state actions and run the web tests.

## Scope
- `apps/web/src/features/ordering/components/OrdersOverview.tsx`
- `apps/web/src/features/ordering/components/OrdersOverview.test.tsx`

## Constraints
- Do not change order creation, selection, filtering, or loading behavior.
- Preserve existing Spanish labels and action callbacks.

## Evidence
- `cd inventory-system/apps/web && pnpm exec vitest run src/features/ordering/components/OrdersOverview.test.tsx` — 1 file passed, 6 tests passed.
- No commit created; delivery remains subject to the user's repository policy.
