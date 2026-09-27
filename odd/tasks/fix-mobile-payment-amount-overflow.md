# Fix mobile payment amount overflow

## Goal
Prevent the “Monto a cobrar” input from overflowing its payment card on narrow iPhone-sized viewports.

## Tasks
- [x] Constrain the currency input flex child so the amount field can shrink within the card.
- [x] Add focused coverage or validation for the narrow-layout regression and run the relevant web tests.

## Scope
- `apps/web/src/features/register/components/RegisterPaymentPanel.module.css`
- `apps/web/src/features/register/components/RegisterPaymentPanel.test.tsx`

## Constraints
- Change layout only; do not alter payment calculations, input values, validation, or checkout behavior.
- Preserve existing desktop and mobile payment layouts.

## Evidence
- `cd inventory-system/apps/web && pnpm exec vitest run src/features/register/components/RegisterPaymentPanel.test.tsx` — 1 file passed, 12 tests passed.
- CSS layout was verified by inspection; jsdom does not measure narrow viewport overflow.
