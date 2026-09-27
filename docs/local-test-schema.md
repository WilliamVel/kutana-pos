# Isolated local test environment

KUTANA's local test app uses the `kutana_test` schema **inside the existing** PostgreSQL database `kutana`. It does not replace the old `public` application or touch Windows production.

## Run on the development Mac

1. Reuse the existing `inventory-system-postgres-1` container from the original `inventory-system` Compose project. Verify it is healthy with `docker ps --filter name=inventory-system-postgres-1`. **Do not** run `docker compose up -d postgres` from this isolated worktree: its separate Compose project attempts a second PostgreSQL instance and volume on the occupied host port `5432`.
2. Before starting the API, confirm `kutana_test.schema_migrations` contains both `021_sales_analytics_completed_at_index.sql` and `022_zero_tax_catalog.sql`. Do not start on a partially migrated schema.
3. In separate terminals from this isolated worktree root, run:

   ```bash
   env -u DATABASE_URL -u POSTGRES_HOST -u POSTGRES_PORT -u POSTGRES_DB -u POSTGRES_USER -u POSTGRES_PASSWORD \
     POSTGRES_SCHEMA=kutana_test HOST=127.0.0.1 PORT=3100 CORS_ORIGIN=http://127.0.0.1:5174 \
     pnpm --filter @kutana/api dev

   VITE_API_BASE_URL=http://127.0.0.1:3100 \
     pnpm --filter @kutana/web exec vite --host 127.0.0.1 --port 5174 --strictPort
   ```

4. Open <http://127.0.0.1:5174>. The API health endpoint is <http://127.0.0.1:3100/health>.

These commands are for local Mac development only; they use the repository's local PostgreSQL defaults. Bind to loopback and do not expose development authentication outside this computer. Restart them after a reboot. No `.env` file needs editing.

## Verified state and boundaries

- A verified backup was taken before applying the ordered migrations `021` then `022` to `kutana_test`. The new schema has 6 categories, 36 catalog products, zero orders/sales/payments, and **zero tax on active products**. Kombucha is a single active unit-priced product at $5; its old size variants remain inactive.
- The isolated API/web answered health and HTTP requests on `3100`/`5174`; the full unit/component suite, typecheck and lint passed. PostgreSQL adapter suites requiring `DATABASE_URL` were skipped rather than run against the clean schema. No new order or payment was created during smoke checks.
- The local source of truth is `kutana_test`: all 21 application tables exist there, with 6 categories and 36 products; orders, sales, payments and auth users are empty. The old application on `3000/5173` was stopped. Under explicit user authorization, its 21 application tables and `reject_mutation()` function were removed from `public` in one restrictive transaction. `public` itself and the `pgcrypto`/`pg_trgm` extensions remain. Never run old-schema migrations or restart the old app against `public` as if it still held the catalog.
- Before that removal, a complete backup was made at `~/KUTANA-backups/kutana-before-public-retirement-20260927-113233.dump` (SHA-256 `444e80b3bd5e582a4046f223cf66ae73e6834aa80e0b23387113bdfa65277484`). Both `pg_restore -l` and a full archive decode with `pg_restore -f /dev/null` passed. To restore old application data, first stop the isolated app and coordinate a separate restore plan from this archive; **do not restore over the live `kutana_test` schema**.
- Migration `021` was copied byte-identically from the analytics worktree under explicit user authorization; reconcile its source history before branch integration. Local source changes are committed on `feat/local-schema-zero-tax`; no push or Windows deployment has occurred. PostgreSQL adapter suites were skipped because `DATABASE_URL` was not provided; no new order or payment was created during checks.
