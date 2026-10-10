# Clarify order ticket totals and headers

## Goal
Improve the POS order ticket hierarchy so product, unit price, and row total headers are visually associated with their rows, and make filtered pending/paid row totals distinct from the global order summary.

## Scope
- Ordering ticket component and styles.
- Focused ordering component tests.
- Product copy remains Spanish; technical artifacts remain English.

## Decisions
- Keep accounting and payment calculations unchanged.
- Label filtered columns according to the active payment tab (`Total pendiente` / `Total pagado`).
- Make the global summary explicit with `Subtotal de la orden` and retain full-order totals.
- Tighten the visual relationship between headers, category headings, and rows.

## Tasks
1. Update order ticket table headers and summary labels. Status: done. Route: inline fallback after delegated writer bootstrap was unavailable.
2. Refine order ticket spacing and header/row hierarchy. Status: done. Route: inline fallback after delegated writer bootstrap was unavailable.
3. Add focused regression coverage and run web checks. Status: done. Component tests 13/13 passed; container suite 12/13 passed with one pre-existing toast-duration expectation failure; typecheck, ESLint, Prettier, and diff check passed.

## Verification
- `pnpm vitest run apps/web/src/features/ordering/components/OrderTicketPanel.test.tsx --no-file-parallelism`: passed, 13/13.
- Combined component/container run: 25/26 passed; the existing container test `removes one unit from an aggregated product using the trash action` expects toast duration 2600 but received 1500. The change does not touch toast behavior.
- `pnpm typecheck`: passed.
- Focused ESLint: passed.
- Prettier check and `git diff --check`: passed.

## Delivery
- Work-unit commit: `98a21df` (`feat(web): clarify filtered order ticket totals`).
- Push and merge requested by user after implementation.
