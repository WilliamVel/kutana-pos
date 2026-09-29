# Compact POS header

## Goal
Reduce the POS header's excessive desktop height caused by the vertical logo while preserving Apple-inspired visual hierarchy, responsive behavior, accessibility, and mobile navigation.

## Tasks
- [x] Inspect authenticated header geometry with Playwright and implement responsive logo/header sizing.
- [x] Add or update regression coverage for compact header layout and image sizing.
- [x] Run focused web tests, typecheck, lint, and Playwright evidence; record results.

## Scope
- `apps/web/src/app-shell/components/TopBar.tsx`
- `apps/web/src/app-shell/components/TopBar.module.css`
- `apps/web/src/app-shell/components/AppShell.module.css`
- `apps/web/src/app-shell/components/TopBar.test.tsx`
- Related focused tests only if required.

## Non-goals
- Do not change navigation logic, auth, or business behavior.
- Do not remove keyboard/focus/accessibility behavior.
- Do not add dependencies.

## Evidence
- Initial visual review: desktop logo is vertical SVG `346.85 × 441.74`; width-only sizing forces approximately 132px image height and approximately 149px header.
- Initial Playwright preview reached the login surface, but authenticated geometry was blocked because the HTTP API was unavailable and login returned invalid credentials.
- Worker changed `TopBar.module.css` to use `height: 2.75rem`, `width: auto`, `max-width`, and `object-fit: contain`; desktop header measured 61px and mobile header 68px.
- Focused TopBar tests: 5/5 passed; TypeScript check passed; `git diff --check` passed.
- Full Playwright suite: 16 passed, 3 unrelated pre-existing order-ticket layout failures.
- Removed the conflicting `.menuButton:focus { outline: none; }` rule so keyboard focus remains visible; focused TopBar tests remained 5/5 passing.
- Work-unit commit: `013e716 fix(web): compact POS header logo`.
- Unrelated pre-existing `LineItemRow` changes were left untouched.
