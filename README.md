# KUTANA POS + Inventory

Hexagonal-architecture pnpm/TypeScript monorepo for a restaurant POS and
inventory system. See `packages/shared` for the framework-free domain, and
the design doc (`sdd/inventory-system/design`) for the full architecture.

## Workspaces

| Workspace         | What                                                                               | Stack        |
| ----------------- | ---------------------------------------------------------------------------------- | ------------ |
| `packages/shared` | Pure domain (entities, value objects, services, ports). Zero runtime dependencies. | TypeScript   |
| `apps/api`        | Backend adapter shell.                                                             | NestJS       |
| `apps/web`        | Frontend adapter shell (PWA).                                                      | React + Vite |

## Prerequisites

- Node.js >= 20
- pnpm 10.x (`corepack enable` recommended)

## Install

```bash
pnpm install
```

## Run

```bash
# Web app dev server
pnpm --filter @kutana/web dev

# API dev server (boots on http://localhost:3000, health check at /health)
pnpm --filter @kutana/api dev
```

## Test

```bash
# Whole monorepo (shared + api + web projects)
pnpm test

# One workspace only
pnpm --filter @kutana/shared test
pnpm --filter @kutana/api test
pnpm --filter @kutana/web test
```

## Typecheck

```bash
pnpm typecheck
```

Uses TypeScript project references (`tsconfig.json` at the root) so each
workspace is checked incrementally against `packages/shared`.

## Lint / Format

```bash
pnpm lint
pnpm format
```

The root ESLint flat config (`eslint.config.js`) enforces the hexagonal
boundary: `packages/shared` cannot import `@nestjs/*`, `react`, `pg`, or
Node's `fs` module. This is mechanically enforced by pnpm's strict,
non-hoisted `node_modules` (an illegal cross-boundary import fails at
resolve time) plus the ESLint `no-restricted-imports` rule as a
defense-in-depth check exercised in
`packages/shared/src/__tests__/architecture-boundary.test.ts`.

## Architecture

- **Hexagonal**: `packages/shared` holds domain and port interfaces; `apps/*`
  are adapter shells depending inward on shared. Shared depends on nothing.
- **Frontend-first delivery**: milestone 1 runs the real domain against
  in-memory mock adapters in `apps/web`; milestone 2 swaps them for
  HTTP/Postgres without touching component code (see `apps/web/src/composition`,
  added starting PR5).
