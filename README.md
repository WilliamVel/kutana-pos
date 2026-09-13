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

## Troubleshooting

### Nest muestra `ERROR [ExceptionsHandler] AggregateError` al iniciar sesión

Este error suele indicar que la API no puede conectarse a PostgreSQL. Comprueba
que el contenedor esté activo y que publique el puerto `5432`:

```bash
docker compose up -d postgres
docker compose ps
```

En la columna `PORTS` debe aparecer `0.0.0.0:5432->5432/tcp`. Después aplica las
migraciones y reinicia la API:

```bash
pnpm --filter @kutana/api migration:apply
pnpm --filter @kutana/api dev
```

Si usas una conexión personalizada, revisa que `DATABASE_URL` en `.env` sea una
URL válida. Si está vacía, la API usa los valores locales de `.env.example`.

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
