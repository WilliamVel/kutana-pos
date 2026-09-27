# Fix mobile active-orders carousel viewport

## Goal
Make the «Órdenes activas» carousel viewport span the full mobile section width while showing one complete mobile card plus a fragment of the next card, keeping horizontal scrolling contained, and preventing page-level horizontal overflow.

## Tasks
- [x] Trace carousel viewport and parent width constraints.
- [x] Fix the limiting container rule.
- [x] Verify responsive behavior at several mobile widths.
- [x] Size mobile cards to reveal the next card on initial render.

## Scope
- `apps/web/src/features/ordering/components/OrdersOverview.module.css`
- `apps/web/src/features/ordering/components/RegisterWorkspace.module.css`
- `apps/web/e2e/orders-overview-layout.spec.ts`

## Checks
- Focused web tests: 11 tests passed.
- Responsive browser checks: 7 e2e tests passed at 320, 375, and 430px; the first card is narrower than the viewport, the next card is initially visible, document width stays within the viewport, and the carousel aligns to the header actions.
