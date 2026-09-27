# Kombucha unit catalog

## Objective
Ship one real KUTANA Kombucha at $5.00 per unit without a pour size, replacing three active volume variants in both independent local and future Windows production databases while retaining historical product references.

## Constraints and decisions
- Keep applied migration `011_seed_kutana_menu_catalog.sql` byte-for-byte unchanged; the migration runner enforces checksums.
- New deterministic forward-only migration `020` inserts a new canonical unit product (price_cents 500) and deactivates only the three known `MENU-KOMBUCHA-*` variants. Preserve old rows and historical order/sale references.
- Tests run with `pnpm --filter @kutana/api test`; test-first convention in `openspec/config.yaml` applies to domain behavior, but no explicit TDD mode is configured for SQL migration. Use focused functional checks.
- Local and production databases are independent. Never assume access to or change the Windows production database from this workspace; backup and connectivity must be established before any live migration.
- Delivery strategy: ask-on-risk; forecast below 400 authored lines (~80). Branch: `feat/kombucha-unit-catalog`.
- User explicitly authorized a local work-unit commit and integration into local `main`; no push or Windows deployment was authorized in that request.

## Tasks
- [ ] KCU-1: Add forward migration and a regression test proving exactly one active Kombucha at $5 per unit, preserving three inactive variants and historical identifiers. Route: delegated writer (multi-file write). Checks: focused API tests, typecheck, SQL/integration validation when DB available; record exact outcomes. Commit: authorized, pending execution.
- [ ] KCU-2: Apply and verify migration on backed-up local database, then prepare bounded Windows production rollout with backup and catalog verification; do not assert production application without access. Route: delegated verification (database command boundary). Checks: query active catalog, migration ledger and ensure archived variants remain; production execution pending Windows host access. Commit: pending authorization where applicable.

## Progress
- User confirmed one generic Kombucha at $5.00, not sized in ml, for local and production.
- Read-only mapping found `011` seeds three volume variants and `019` is latest migration. `line_items.product_id` references products; keep old rows inactive.
- KCU-1 implementation is present but not checked off: `020_kombucha_unit_catalog.sql` inserts a new unit Kombucha at 500 cents and deactivates only the three previous variants, incrementing their versions. Two migration discovery expectations and a SQL-shape regression test were updated. Commit and local main integration authorized, pending execution.
- Writer and independent verifier observed `cd inventory-system && pnpm --filter @kutana/api test` PASS (16 files/64 tests passed; 5 PostgreSQL suites/58 tests skipped without `DATABASE_URL`); migration 011 was unchanged. Independent pre-commit `cd inventory-system && pnpm test` PASS (103 files/475 tests passed, 5 PostgreSQL suites/58 tests skipped; non-failing React act warnings), `pnpm typecheck` PASS, `pnpm lint` PASS and `git diff --check` PASS. Migration 020 was also executed and checked against local PostgreSQL as below.
- Native risk assessment returned `unassessable` because untracked files require explicit declaration; independent verifier was run accordingly. Its warning about single-file rerun/transaction is addressed by the migration runner's ledger and transaction, not by a new SQL transaction.
- Read-only local preflight: Docker PostgreSQL healthy on localhost:5432, database `kutana`; latest applied migration is 017, so 018–020 are pending. Three legacy Kombucha rows are active at 300/500/800 cents, version 2; 15 historical line items reference them (5/9/1).
- Verified local backup: `~/KUTANA-backups/kutana-local-before-kombucha-20260926-221000.dump` (92,720 bytes, pg_restore inventory readable, SHA-256 2ecf5800c125778a64776528e6e1f00b59b1686fc4923d351d80768ab22183aa). Directory permission 0700 and dump written with umask 077. Restore has not been exercised.
- Local prerequisite resolved: user authorized renaming only `M2` (id deb75499-e703-413a-b957-6b26f31350c3) to `M2-2` in test DB. Guarded transaction changed one row, incremented its version, preserved both table IDs. Previously colliding `m2` remains.
- Local DB migration `env -u DATABASE_URL -u POSTGRES_HOST -u POSTGRES_PORT -u POSTGRES_DB -u POSTGRES_USER -u POSTGRES_PASSWORD pnpm --filter @kutana/api migration:apply` succeeded from repo root. Independent read-only verification: ledger includes 018/019/020, table-label index exists with zero duplicates; one active `MENU-KOMBUCHA-UNIT` row (`unit`, `pour_size_ml NULL`, `stock_item_id NULL`, 500 cents) and three inactive original volume variants, still referenced by 15 historical line items. Product count increased from 36 to 37. Existing `COCA-COLA-ZERO-UNIDAD` was part of preexisting 36 rows; its provenance was not established and it was not removed. Production remains untouched.
- Database rollback is not automatic: the entire pre-migration archive is available, but restoring it would also revert other intervening changes; no restore was attempted. Source rollback boundary: remove migration 020 and its assertions only before other databases have applied 020; after apply, never rewrite 020.
- Engram mirror: pending (provider version mismatch; retry when available).

## Next step
Create the authorized work-unit commit, record its identity, and integrate into local `main` without push. For Windows production, obtain controlled host access, separately back up its database, inspect applied migrations/duplicates/catalog, deploy the same version, apply pending migrations and independently verify. Do not assume the local `M2` collision also exists there. Engram mirror remains pending.
