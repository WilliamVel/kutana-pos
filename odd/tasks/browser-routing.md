# Browser routing for web navigation

## Goal

Replace the web app's root-level screen state navigation with URL-backed React Router navigation so browser back/forward, refresh, and shareable screen URLs work.

## Scope

- Add React Router to `apps/web`.
- Map existing top-level screens to stable paths.
- Preserve role access checks and existing in-screen workspace state.
- Keep browser navigation synchronized without introducing a new data-fetching layer.

## Non-goals

- Redesign the navigation UI.
- Convert every modal or table/payment sub-state into a URL.
- Introduce TanStack Query or change API data loading.

## Tasks

1. Add router dependency and route definitions around the existing app shell. — done
2. Migrate top-level screen navigation from `useState` to route location/navigation while preserving guards and reset behavior. — done
3. Add focused tests for route rendering and browser navigation; run web checks. — done

## Acceptance criteria

- `/`, `/orders`, `/inventory`, `/customers`, `/pending-debts`, `/analytics`, and `/users` resolve appropriately. — verified by route mapping and build
- Existing role restrictions remain enforced. — preserved in `App.tsx`
- Browser back/forward changes the visible screen. — uses BrowserRouter history navigation
- Refreshing a supported URL preserves that screen. — screen derives from `location.pathname`
- Existing focused tests and web build pass. — verified below

## Evidence

- Branch: `feat/browser-routing`
- Commits: `2a1659f` (`feat(web): add browser-backed navigation`), `3dd674a` (`fix(web): canonicalize root route`), `c35be6e` (`fix(web): deduplicate React in Vite`), follow-up pending for canonical login route
- Tests: `npx pnpm@10.11.0 --dir inventory-system exec vitest run apps/web/src/app-shell/screens.test.ts apps/web/src/App.test.tsx --no-file-parallelism` — 10 passed
- Build: `npx pnpm@10.11.0 --dir inventory-system --filter @kutana/web build` — passed
- Note: the repository declares pnpm 10.11.0; the host's default pnpm 11.25.0 failed the package-manager guard, so verification used the declared version via npx.
