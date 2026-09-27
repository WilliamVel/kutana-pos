# Local main environment

KUTANA runs locally from `main` against the existing PostgreSQL container `inventory-system-postgres-1` and the `public` schema. Windows production is unchanged.

## Run on the development Mac

1. Verify the existing container is healthy:

   ```bash
   docker ps --filter name=inventory-system-postgres-1
   ```

   Do not run `docker compose up -d postgres` from another worktree; it can attempt a second PostgreSQL instance on host port `5432`.

2. Start the API and web app in separate terminals from the main worktree:

   ```bash
   env -u DATABASE_URL -u POSTGRES_HOST -u POSTGRES_PORT -u POSTGRES_DB -u POSTGRES_USER -u POSTGRES_PASSWORD \
     POSTGRES_SCHEMA=public HOST=127.0.0.1 PORT=3000 CORS_ORIGIN=http://127.0.0.1:5173 \
     pnpm --filter @kutana/api dev

   VITE_API_BASE_URL=http://127.0.0.1:3000 \
     pnpm --filter @kutana/web exec vite --host 127.0.0.1 --port 5173 --strictPort
   ```

3. Open <http://127.0.0.1:5173>; the API health endpoint is <http://127.0.0.1:3000/health>.

Bind to loopback only. No `.env` change is required. These commands are for local Mac development.

## Verified state and recovery

- `POSTGRES_SCHEMA=public` is the local source of truth. The catalog contains 6 categories and 36 products, with zero active tax. Caro and Juan are active administrators; do not record or share their PINs.
- The temporary `kutana_test` schema was removed. The `public` schema and its `pgcrypto` and `pg_trgm` extensions were preserved.
- The final full verified backup is `~/KUTANA-backups/kutana-final-before-public-cutover-20260927-155208.dump` (SHA-256 `7ab898125b25ca682430c8fefa906c1f0e8d6ecfbdd6c14cc072b140e5984003`). Before the cutover, `~/KUTANA-backups/kutana-before-public-retirement-20260927-113233.dump` (SHA-256 `444e80b3bd5e582a4046f223cf66ae73e6834aa80e0b23387113bdfa65277484`) was also verified with `pg_restore -l` and a full archive decode. For recovery, stop the local app first and coordinate a restore plan; never restore over a live database without explicit authorization.
- Unit/component tests, typecheck, and lint passed. Full PostgreSQL adapter tests were skipped because `DATABASE_URL` was not provided. No new order or payment was created during smoke checks.
