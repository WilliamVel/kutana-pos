# POS order ticket visual ordering

## Scope
Visual-only ordering and grouping of the POS order ticket. Persisted order line arrays, line IDs, positions, payment allocations, prices, taxes, totals, and removal behavior remain unchanged.

## Confirmed architecture
- `OrderTicketPanelContainer` performs presentation aggregation and payment/member mapping.
- `aggregateOrderLines` groups repeated immutable sale lines while keeping the first member ID.
- `OrderTicketPanel` renders the same `lines` collection into desktop table and mobile rows.
- `ProductRepository` and `CategoryRepository` are available through `PortsProvider`; current catalog classification is not persisted on `LineItem`.
- `LineItemRow` already owns shared row behavior for both layouts.

## Plan
1. Add a pure stable visual classification/order function after aggregation. It uses current catalog category metadata plus persisted pour size as display metadata only; adjustments stay separate.
2. Enrich the ticket read path with read-only `productId` -> current category/product metadata lookups. Missing metadata falls back without blocking rendering.
3. Add non-empty group headers and responsive-safe CSS while keeping the same ordered lines and IDs for desktop/mobile.
4. Add regression tests for size/category/fallback ordering, stable aggregation/member mappings, payment/removal invariants, adjustments, empty groups, and persisted order immutability.
5. Run focused frontend tests, typecheck, lint, and relevant build/check commands; record evidence here.

## Non-goals
- No shared line-item model changes.
- No API/database/migration/persistence changes.
- No historical category snapshots.

## Evidence
- Initial repository exploration completed before source edits.
- Current catalog classification is loaded read-only through `CategoryRepository.listAll()` plus `ProductRepository.listByCategory(..., { includeInactive: true })`; metadata is kept in component state and never persisted.
- `aggregateOrderLines` runs before `orderTicketLines`; the same resulting `sections` collection feeds desktop and mobile renderers.
- `pnpm --filter @kutana/web test`: passed (67 files, 321 tests).
- `pnpm --filter @kutana/web build`: passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- Changed-file Prettier check: passed. Repository-wide `pnpm format:check` remains blocked by 124 pre-existing/unrelated formatting findings.
- `git diff --check`: passed.
- No shared model, API adapter, persistence, database, or schema files changed.
