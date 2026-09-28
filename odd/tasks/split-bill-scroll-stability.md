# Split-bill scroll stability

## Goal
Prevent the product-division screen from jumping to the top when products are selected or quantities change.

## Scope
- Stabilize derived split-bill line data across parent renders.
- Make selection synchronization idempotent and avoid redundant Set/Map state updates.
- Add focused regression coverage for rerender stability.
- Preserve current assignment and quantity behavior.

## Non-goals
- No redesign of the register workspace or scroll containers.
- No changes to persistence or allocation semantics.

## Tasks
1. [x] Stabilize `lines`/account derived props in `SplitBillContainer`.
2. [x] Make `SplitBillView` synchronization updates conditional/idempotent.
3. [x] Add regression tests and run focused web checks.

## Evidence
- Initial analysis found no explicit scroll reset.
- Suspected cause: unstable `toLines(...)` identity plus `[lines]` effect allocating fresh Set/Map values.
- `SplitBillContainer` now memoizes derived lines and account rows by source collections.
- `SplitBillView` now returns existing Set/Map state when synchronization produces equivalent contents.
- Added a Profiler regression test ensuring a fresh equivalent `lines` array causes only the prop-driven commit.
- Focused web tests passed: 26 tests across the SplitBillView and SplitBillContainer suites.
- Added `apps/web/e2e/split-bill-scroll.spec.ts` covering Mesa 4 at mobile 390x844: entering product division, scrolling to Coca-Cola, selecting it, and changing quantity. Its initial immediate assertion missed delayed smooth scrolling.
- Follow-up diagnosis: `OrdersOverviewContainer` passes a newly sorted `rows` array each render; `OrdersOverview` effects on `[rows, selectedTableId]` and calls `scrollIntoView({behavior: "smooth"})` on the selected table. Selecting a product updates App state, rerenders the table list, and scrolls the mobile document to the table above the selected product.
- Added a component regression proving a fresh equivalent rows array does not issue a second selected-table scroll. The container now memoizes sorted rows, and `OrdersOverview` guards scrolling to actual selected-table transitions while still scrolling once when the selected row first becomes available.
- RED: the new component test failed because the equivalent rows rerender called `scrollIntoView` once more.
- GREEN: focused Vitest passed (12 tests across both OrdersOverview suites), web build passed, and the updated mobile split-bill Playwright test passed.
- The full Playwright command also ran unrelated layout tests; 15 passed and 3 failed in `order-ticket-flow-layout.spec.ts` (desktop table-cell display, divider row count, and mobile product scroll), outside this change.
- Independent verification: OrdersOverview unit tests passed (7/7), fresh web build passed, and the isolated mobile Playwright regression passed (1/1). An extra `tsc --noEmit` run was blocked by a missing unrelated `src/features/__lint-fixtures__/violating-adapter-import.fixture.tsx` in the ambient workspace; Playwright reused an existing preview process after the fresh build.

## Follow-up tasks
4. [x] Add a Playwright mobile regression that observes the settled scroll after tapping the last product.
5. [x] Stabilize table-list identity and prevent selected-table re-scrolling on unrelated renders.
6. [x] Run focused tests and browser regression.
