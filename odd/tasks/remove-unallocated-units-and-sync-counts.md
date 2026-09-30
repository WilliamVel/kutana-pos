# Remove unallocated units and sync counts

## Goal
Allow removing only unassigned product units and keep visible paid/pending counts consistent with allocation state.

## Tasks
- [x] Derive removability from unallocated quantity, not the presence of any allocation.
- [x] Remove an unallocated source unit safely when aggregated lines share a product key.
- [x] Add regression coverage for partial allocations, count splitting, and protected fully assigned units.
- [x] Run focused checks and commit the work unit.

## Evidence
- Focused ordering tests: 25 passed.
- `pnpm typecheck`: passed.
- `git diff --check`: passed.
- Implementation landed in `e0acf8f` alongside rapid-order feedback stabilization.


## Non-goals
- Do not delete or alter paid/account-assigned units.
- Do not change payment allocation or persisted accounting math.
