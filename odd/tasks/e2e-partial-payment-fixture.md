# Stateful E2E fixture for partial payment return

## Goal
Add a Playwright fixture that persists account allocations and payments across intercepted HTTP requests, then verify that paying one split account returns to the main open-order view while another account remains pending.

## Tasks
- [x] Build a reusable stateful HTTP fixture for the split-payment E2E flow.
- [x] Add a browser regression test for partial account payment and return to the open order.
- [x] Run the focused Playwright test and record full-suite limitations.

## Correction discovered by the browser test
The `Cobrar productos` path was also treating every selected-product payment as final. It now checks whether every line item is paid before closing; otherwise it returns to the main open-order view. The order-list reload is also triggered after a non-final payment so the card's pending amount matches the detail view.

## Evidence
- `pnpm --filter @kutana/web test:e2e -- e2e/partial-payment-return.spec.ts` — focused regression passed; the command also ran the existing suite, with 18 passed and 5 unrelated layout/scroll failures.
- `pnpm exec vitest run --no-file-parallelism apps/web/src/features/register/containers/RegisterPaymentContainer.test.tsx apps/web/src/App.test.tsx` — 15 passed.
- `pnpm exec prettier --check ...` — passed.
- `pnpm typecheck` and `git diff --check` — passed.
- [ ] Record the work-unit commit after explicit authorization.
