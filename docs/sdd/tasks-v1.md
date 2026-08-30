# Tasks: KUTANA POS v1

Authoritative implementation checklist. Recovered and version-controlled so it
cannot be lost to a memory-store overwrite. Update the checkboxes here as work
lands; this file is the source of truth for the remaining PR chain.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 3000-4500 (Milestone 1 alone) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Feature Branch Chain, 7 PRs (see units below) |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

### Work Units (PR1 base = tracker, PR2 base = PR1, ...)

| Unit | Goal | PR | Focused test command | Rollback boundary |
|---|---|---|---|---|
| 1 | Monorepo scaffold + tooling | PR1 | `pnpm -w typecheck` | delete repo root configs |
| 2 | Money/rounding/allocation domain (TDD) | PR2 | `pnpm --filter shared test` | revert `packages/shared/money`,`billing` |
| 3 | Catalog/inventory/ordering domain + ports | PR3 | `pnpm --filter shared test` | revert respective `packages/shared/*` dirs |
| 4 | Mock adapters + port conformance suite | PR4 | `pnpm --filter shared test -- contract` | revert `apps/web/src/adapters/mock`, contract dir |
| 5 | Composition root + design system tokens | PR5 | `pnpm --filter web test` | revert `apps/web/src/composition`,`design-system` |
| 6 | Inventory/catalog/register/orders screens | PR6 | `pnpm --filter web test` | revert `apps/web/src/features/{inventory,catalog,register,ordering}` |
| 7 | Split-bill screen + conflict UI + E2E | PR7 | `pnpm --filter web test` + `pnpm exec playwright test split-bill` | revert `apps/web/src/features/split-bill` |

## Milestone 1 - Domain foundations + demo UI on mocks (NO backend)

**Exit criterion: `pnpm --filter web dev` shows inventory, orders, register, and
split-bill screens fully interactive on mock adapters; no `apps/api` code
required to run the demo.**

### Phase 1: Monorepo & Tooling - PR1 (COMPLETE, commit 0ca122d)
- [x] 1.1 Create `pnpm-workspace.yaml` (apps/*, packages/*), root `tsconfig.base.json` (strict:true, path alias `@kutana/shared`).
- [x] 1.2 Add `vitest.workspace.ts` with 3 projects (shared, web, api-stub); configure `globals: true`.
- [x] 1.3 Add root ESLint flat config: `no-restricted-imports` banning `@nestjs/*`/`react`/`pg`/fs in `packages/shared`, banning locally-declared domain shapes in `apps/web` (must import from `@kutana/shared`), banning raw hex outside `design-system/tokens/`.
- [x] 1.4 Scaffold `packages/shared` (`composite: true`), `apps/web` (Vite+React+PWA), `apps/api` (empty NestJS shell, no logic yet).
- [x] 1.5 RED: add a lint-rule test/fixture proving the guard fires on a violating fixture file. NOTE: implemented as a general import-boundary guard (`architecture-boundary.test.ts`); the `'CASH'`-literal-specific guard is task 4.5 and remains open.

### Phase 2: Money & Rounding (TDD) - PR2
- [x] 2.1 RED: `packages/shared/money/money.test.ts` - cents-only arithmetic, rejects floats.
- [x] 2.2 GREEN: implement `Money` value object in `money/money.ts`.
- [x] 2.3 RED: `largest-remainder.test.ts` - property test (fast-check) `sum(largestRemainderSplit(total, weights)) === total` over random inputs; explicit 3-way and 7-way indivisible cases from spec.
- [x] 2.4 GREEN: implement `largestRemainderSplit` in `money/largest-remainder.ts`.

### Phase 3: Billing Domain - Allocation & Tickets (TDD) - PR2
- [x] 3.1 RED: `billing/model/allocation.test.ts` - one 100%-share Allocation per LineItem invariant; rejecting a second allocation without removing the first (spec scenario).
- [x] 3.2 GREEN: implement `Allocation`, `Ticket`, `Sale` models in `billing/model/`.
- [x] 3.3 RED: `billing/services/split-allocation.test.ts` - covers: split partially-paid ticket, moving last item empties ticket (and rejects payment while empty), re-merge tickets, new item after split must be allocated, reject modifying a paid ticket.
- [x] 3.4 GREEN: implement `splitAllocation`, `mergeTickets`, `ticketTotals` in `billing/services/`.
- [x] 3.5 Guard task: add a regression test asserting `line_items` model/ports never expose a `ticket_id` field - Allocation is the only path from LineItem to Ticket (encodes risk #1 from proposal).

### Phase 4: Payments Domain (TDD) - PR3
- [ ] 4.1 RED: `payments/model/payment-method-registry.test.ts` - registry-driven behavior (requires_tendered), CASH computes change, BANK_TRANSFER/QR_PAYMENT do not.
- [ ] 4.2 GREEN: implement `PaymentMethodCode` (branded string), `PaymentMethodRegistry` port + seed data.
- [ ] 4.3 RED: `payments/services/apply-payment.test.ts` - partial payments, two-partial-payments-cover-ticket, overpayment/change-due scenarios from spec.
- [ ] 4.4 GREEN: implement `applyPayment`, `computeChange`.
- [ ] 4.5 Guard task: static test scanning `packages/shared/**` source (excluding the registry seed file) asserting no file contains the literal `'CASH'`.

### Phase 5: Catalog & Inventory Domain (TDD) - PR3
- [ ] 5.1 RED: `catalog/model/product.test.ts` - required fields, active/inactive toggle hides from ordering.
- [ ] 5.2 GREEN: implement `Product`, `Category`, `TaxRate`, `PourSize` in `catalog/model/`.
- [ ] 5.3 RED: `inventory/services/apply-movement.test.ts` - volume pour (500/750/1000ml) decrements shared `StockItem(kind:'volume')` via `StockMovement`; unit-kind decrements by count; low-stock check.
- [ ] 5.4 GREEN: implement `StockItem`, `StockMovement`, `applyMovement`, `lowStockCheck` in `inventory/`.
- [ ] 5.5 RED: `catalog/services/tax-at-sale.test.ts` - tax computed and persisted per LineItem at sale time; later catalog rate change does not retroactively alter it.
- [ ] 5.6 GREEN: implement tax-snapshot logic (pure function used at LineItem creation).

### Phase 6: Ordering Domain (TDD) - PR3
- [ ] 6.1 RED: `ordering/model/order.test.ts` - LineItem immutability (corrections only as new adjustment lines, never edited in place), Order/Table status transitions (active -> needs check -> paid).
- [ ] 6.2 GREEN: implement `Table`, `Order`, `LineItem`, `OrderStatus` models, `addLineItem`, `addAdjustmentLine` in `ordering/`.
- [ ] 6.3 RED: `ordering/services/version-conflict.test.ts` - concurrent write at stale version rejected; caller receives current snapshot (spec: concurrent edit conflict scenario), never a silent overwrite.
- [ ] 6.4 GREEN: define `OrderRepository.save(order, expectedVersion)` port contract that throws `ConflictError` on stale version (implementation lives in adapters; this task defines the port + `ConflictError` in `errors/`).
- [ ] 6.5 Define remaining ports: `ProductRepository`, `CategoryRepository`, `StockRepository`, `TicketRepository`, `SaleRepository`, `OrderEvents` in each context's `ports/` dir - interfaces only, no implementation.

### Phase 7: Port Conformance Test Suite (built now, not retrofitted) - PR4
- [ ] 7.1 Write one exported `describe`-block contract suite per port under `packages/shared/*/ports/__contract__/` (orders, tickets, payments, products, stock) - asserts port semantics (e.g. version-conflict throws `ConflictError`, `findByTable` returns null when absent) independent of implementation.
- [ ] 7.2 RED: run each contract suite against a not-yet-written mock adapter (fails - adapter doesn't exist) to prove the suite is implementation-agnostic before Phase 8.

### Phase 8: Mock Adapters (GREEN against Phase 7 contracts) - PR4
- [ ] 8.1 Implement in-memory `MockOrderRepository`, `MockTicketRepository`, `MockPaymentRepository`, `MockProductRepository`, `MockStockRepository` in `apps/web/src/adapters/mock/`, each passing its Phase 7 contract suite.
- [ ] 8.2 Implement `MockOrderEvents` as an in-process `EventEmitter` implementing the `OrderEvents` port.
- [ ] 8.3 Add ~120ms simulated latency to all mock methods; add a test-only trigger to force `ConflictError` on demand (powers the demo's 409 UI).
- [ ] 8.4 Write seed fixtures (products, categories, tables, one open order) importing only `@kutana/shared` types - no ad-hoc shapes.

### Phase 9: Composition Root & Design System - PR5
- [ ] 9.1 Define `Ports` type and `apps/web/src/composition/ports.ts`; implement `PortsProvider.tsx` (React context) + typed hooks (`useOrders`, `useTickets`, etc.).
- [ ] 9.2 Implement `composition/mock.ts` wiring all Phase 8 adapters; wire `main.tsx` to call `buildMockPorts()` (HTTP branch stubbed as a TODO for milestone 2, not implemented now).
- [ ] 9.3 Create `design-system/tokens/palette.css` with the exact role-named tokens (`--surface-page: #F5F0E1`, `--text-primary: #1D3124`, `--action-primary-bg: #D65C2B`, etc.) - raw hex appears only here.
- [ ] 9.4 RED: design-system test asserting no body-text atom/molecule resolves to `--accent-emphasis`/terracotta, and asserting `--text-terracotta` is not defined anywhere in tokens.
- [ ] 9.5 GREEN: build atomic `atoms/` (Button, Input, Badge, Icon) and `molecules/` (PriceTag, StatusPill, LineItemRow) consuming only role tokens.

### Phase 10: Screens - Inventory, Catalog Form, Orders, Register - PR6
- [ ] 10.1 RED: presentational component tests (Testing Library, props only, no ports) for `InventoryList`, `ProductForm`, `OrderTablePanel`, `RegisterPaymentPanel`.
- [ ] 10.2 GREEN: implement presentational components in `features/{inventory,catalog,register,ordering}/components/`.
- [ ] 10.3 Implement containers in `features/{inventory,catalog,register,ordering}/containers/` consuming ports via hooks; wire add/edit product form to `ProductRepository`.
- [ ] 10.4 Implement all-orders view + per-table ticket panel subscribing to `OrderEvents` for realtime updates (mock EventEmitter).
- [ ] 10.5 Implement register/payment screen: amount tendered input, computed change due via `computeChange`, method selection from `PaymentMethodRegistry` (registry-driven, no hardcoded list).

### Phase 11: Split-Bill Screen (demo centerpiece) + Conflict UI - PR7
- [ ] 11.1 RED: component tests for two-panel `OriginalBillPanel`/`NewBillPanel` - moving a line item updates both panels' totals correctly using `ticketTotals`.
- [ ] 11.2 GREEN: implement split-bill presentational components in `features/split-bill/components/`.
- [ ] 11.3 Implement split-bill container calling `splitAllocation`/`mergeTickets` through `TicketRepository`, driven by drag/tap-to-move interaction.
- [ ] 11.4 RED: component test for the conflict banner - on `ConflictError`, shows non-technical message + refreshed order, re-enables the action.
- [ ] 11.5 GREEN: implement conflict banner component; wire mock adapter's on-demand `ConflictError` trigger to a demo control (e.g. a debug button) so the 409 path is demoable live.
- [ ] 11.6 Playwright E2E (against mock build): split a table's bill into 2 tickets and pay each independently - the milestone 1 exit scenario.

## Milestone 2 - Backend for the core path (coarse; re-planned closer to start)

- [ ] Write forward-only numbered SQL migrations for all tables in the design's data model (products, categories, stock_items, stock_movements, tables, orders, line_items, tickets, allocations, payments, payment_methods, sales, customers) with the exact CHECK/UNIQUE constraints (`allocations.share_bp = 10000`, `UNIQUE(line_item_id)`) and the `line_items` immutability trigger.
- [ ] Implement Postgres repositories per port in `apps/api/*/persistence/`, each passing the Phase 7 contract suites (Testcontainers).
- [ ] Implement NestJS controllers/DTOs per bounded context; implement WebSocket gateway publishing `OrderEvent` snapshots after transaction commit, per-table + register rooms.
- [ ] Implement optimistic locking at the SQL layer (`UPDATE ... WHERE id=$1 AND version=$2`; 0 rows -> 409 with fresh snapshot).
- [ ] Implement `composition/http.ts`; flip `main.tsx` to `VITE_ADAPTER=http` - verify zero component changes required.
- [ ] Integration tests: version conflict end-to-end, transactional event publish ordering.

## Milestone 3 - Depth, import, reports, backup, customers (coarse)

- [ ] Extend inventory: low-stock alert delivery, richer stock reason codes.
- [ ] CSV/Excel bulk import through the same validated write path as manual creation; per-row error reporting without blocking valid rows.
- [ ] Sales/order-flow reporting read models.
- [ ] Scheduled `pg_dump` backup job in `apps/api/src/jobs/` (encrypt, upload, prune) + documented restore procedure.
- [ ] Customer build-out: UI/write paths for creating and linking customers (model already exists from v1).

## Explicitly Not Tasked (per scope)

No tasks for: SRI e-invoicing, fractional/shared-item splitting, spillage/waste
tracking, production batches/lots, offline autonomy/CRDTs, pessimistic locking,
multi-venue, auth/login, receipt/printer format (blocked on open question).

## Open Dependencies

- Receipt/printer format and whether split tickets print separately - unanswered; blocks milestone 2/3 printing work only.
- IVA uniform vs per-product - seeding decision only; schema (`tax_rate_bp` per product) already correct either way.
