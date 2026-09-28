# Split-bill category sections

## Scope
Reuse the POS ticket's current-catalog visual classification in the split-bill window for unassigned and assigned products. Preserve all allocation and payment behavior.

## Confirmed architecture
- `SplitBillContainer.toLines()` aggregates persisted lines and retains `lineItemIds` for allocation mapping, but currently discards product identity and size metadata.
- `SplitBillView` renders unassigned and assigned product lists from those view models.
- The POS classifier in `apps/web/src/features/ordering/visual-ordering.ts` currently depends on the ticket row type and must be generalized without changing its ordering rules.
- Current catalog metadata is available through `CategoryRepository` and `ProductRepository`; it is not persisted on line items.

## Plan
1. Generalize the pure visual classifier to accept split-bill line shapes.
2. Preserve productId, pourSizeMl, adjustment status, and category-relevant metadata in split-bill view models.
3. Load current catalog metadata read-only in `SplitBillContainer` and derive stable sections for unassigned and assigned lists.
4. Render non-empty Bebidas, Comida, and Ajustes headers in both split-bill product views.
5. Add tests for category ordering, stable aggregation, empty sections, assigned/unassigned rendering, and allocation identity preservation.
6. Run focused split-bill tests, full web tests, build, typecheck, lint, and formatting checks.

## Non-goals
- No persistence, API, schema, payment, allocation, or line-item model changes.
- No historical category snapshots.

## Evidence
- Generalized `visual-ordering.ts` and reused its exact stable ordering for split-bill unassigned and assigned lists.
- Split-bill now loads current catalog metadata read-only and preserves `lineItemIds`/`allocationIds`.
- Focused tests: 24 passed.
- Full web tests: 323 passed.
- Web build, typecheck, lint, Prettier, and `git diff --check`: passed.
- Existing React `act(...)` warnings remain, with no test failures.
