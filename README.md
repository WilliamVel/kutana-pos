# KUTANA POS + Inventory

Hexagonal-architecture pnpm/TypeScript monorepo for a restaurant POS and
inventory system. See `packages/shared` for the framework-free domain, and
the design doc (`sdd/inventory-system/design`) for the full architecture.

## Workspaces

| Workspace | What | Stack |
|---|---|---|
| `packages/shared` | Pure domain (framework- and I/O-free). | TypeScript |
| `apps/api` | Backend adapter shell. | NestJS + PostgreSQL |
| `apps/web` | Frontend adapter shell (PWA). | React + Vite |

## Prerequisites

- Node.js >= 20
- pnpm 10.x (`corepack enable` recommended)
- Docker (for local PostgreSQL)

## Run

```bash
pnpm install
docker compose up -d postgres
pnpm --filter @kutana/api migration:apply
pnpm --filter @kutana/api dev
```

Copy `.env.example` to `.env` for local configuration. `DATABASE_URL` takes
precedence; otherwise the API uses the safe local defaults shown in Compose.
Never commit `.env` or production credentials.

## Migrations

SQL migrations live in `apps/api/migrations` and use the deterministic
`NNN_description.sql` convention (for example `001_initial_schema.sql`). They
run in numeric order inside one transaction. Applied versions and SHA-256
checksums are tracked in `schema_migrations`; changing an applied file fails
rather than silently masking drift.

```bash
pnpm --filter @kutana/api migration:apply
pnpm --filter @kutana/api migration:rollback # forward-only v1 currently refuses rollback
```

## Test and typecheck

```bash
pnpm --filter @kutana/api test
pnpm typecheck
```

The root ESLint configuration enforces the shared package boundary: shared
cannot import Nest, React, `pg`, or Node I/O modules.
