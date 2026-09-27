# Preserve order line placement after decrement

## Objective
Keep a product row in its original place when removing one unit, even when multiple persisted lines share the same creation timestamp. Retain the current Sonner removal notifications and allocation guard.

## Problem and rationale
PostgreSQL reads order lines using `ORDER BY created_at, id`. A decrement replaces an immutable persisted line with a new ID. Preserving `createdAt` alone cannot maintain position if timestamps tie; an explicit persisted position is required.

## Scope and constraints
- Forward-only migration; do not modify old migration checksums.
- Preserve immutability, existing line IDs for unaffected lines, and account-allocation guard.
- Backfill existing positions in the current `(created_at, id)` order.
- Add focused domain and database adapter tests; when DATABASE_URL is unavailable, report integration tests as skipped rather than passed.
- Unrelated working-tree changes are out of scope.
- Strict TDD was not activated in the prior implementation; ordinary focused tests use `pnpm test`.
- Estimated authored changes: approximately 180–260 lines; delivery strategy: ask-on-risk if >400, no commit requested.

## Tasks
- [x] O1 Inspect persisted ordering and migration contract. Evidence: `line_items` has no position; Postgres sorts by `(created_at, id)`.
- [x] O2 Add stable per-order position to schema/domain/repository; preserve it on immutable decrement and assign appended positions; add tie regression.
- [x] O3 Run focused tests, typecheck and structural checks; report DB integration availability and remaining limitations. Migration 023 was applied successfully to the local configured database; `line_items.position` confirmed present. Vitest: 4 migration tests passed; 12 PostgreSQL integration tests skipped when `DATABASE_URL` is unset.

## Next step
Delegate O2 with bounded surfaces, then independently verify O3 and spot-check the checks.
