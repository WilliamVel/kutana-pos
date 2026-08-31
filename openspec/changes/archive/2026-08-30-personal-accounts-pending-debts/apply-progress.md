# Apply Progress: Personal accounts and pending customer debts

## Structured status consumed

- schema: `gentle-ai.sdd-status@1`
- change: `personal-accounts-pending-debts`
- artifact store: `openspec`
- apply state: `ready`
- action context: `repo-local`
- workspace root: `/Users/wiliveliz/Documents/WORK/KUTANA/inventory-system`
- allowed edit roots: `/Users/wiliveliz/Documents/WORK/KUTANA/inventory-system`
- warnings: none

## Workload / PR boundary

- Selected delivery path: split into subagent-owned slices.
- Slice completed in this entry: Subagent 1 — Domain accounts and quantity allocation.
- Scope boundary: `packages/shared` domain files and OpenSpec task/progress artifacts only.
- PR/rollback boundary: remove `packages/shared/src/billing/model/personal-account.ts`, `packages/shared/src/billing/model/personal-account.test.ts`, and revert the Subagent 1 task checkbox updates in this change artifact.

## Completed tasks

- [x] Add tests for `Customer` creation and identity assumptions.
- [x] Add tests for `PersonalAccount` owner invariants: identified customer or free-name, never neither, never both.
- [x] Add tests for quantity-level `AccountLineAllocation`.
- [x] Add tests rejecting over-allocation beyond the source line-item quantity.
- [x] Add tests proving allocation is by quantity only, not arbitrary amount.
- [x] Add tests for personal account total/paid/remaining calculations.
- [x] Add tests for account status derivation: open, partially_paid, pending, paid.
- [x] Implement the pure domain models and services in `packages/shared`.

## Files changed

- `packages/shared/src/billing/model/personal-account.ts`
- `packages/shared/src/billing/model/personal-account.test.ts`
- `openspec/changes/personal-accounts-pending-debts/tasks.md`
- `openspec/changes/personal-accounts-pending-debts/apply-progress.md`

## TDD Cycle Evidence

| Cycle | RED evidence | GREEN / refactor evidence |
|---|---|---|
| Customer, account, allocation, balance models | `./node_modules/.bin/vitest run packages/shared/src/billing/model/personal-account.test.ts` failed because `./personal-account.js` did not exist. | Added framework-free domain model/service functions; focused test command passed with 7 tests. |

## Test commands run

- `pnpm --filter @kutana/shared exec vitest run src/billing/model/personal-account.test.ts` — failed: `/bin/bash: pnpm: command not found`.
- `./node_modules/.bin/vitest run packages/shared/src/billing/model/personal-account.test.ts` — RED failed: missing `./personal-account.js`.
- `./node_modules/.bin/vitest run packages/shared/src/billing/model/personal-account.test.ts` — passed: 1 file, 7 tests.
- `./node_modules/.bin/vitest run packages/shared/src` — failed only because existing architecture-boundary test shells out to missing `pnpm`; 16 files and 97 tests passed before that tooling failure.
- `./node_modules/.bin/tsc --build packages/shared/tsconfig.json` — failed once for a strict indexed access issue, then passed after refactor.
- `./node_modules/.bin/vitest run packages/shared/src/billing/model/personal-account.test.ts` — passed after refactor: 1 file, 7 tests.

## Deviations from design

- None for this slice. `Ticket` remains untouched as a temporary existing milestone-1 concept for later cleanup slices.
- Payment target migration and debt ledger behavior are intentionally deferred to later assigned slices.

## Remaining tasks

- [ ] Add tests for append-only customer debt debit/credit entries.
- [ ] Add tests for debt balance calculation from ledger entries.
- [ ] Add tests for accumulating debt across multiple visits.
- [ ] Add tests for partial later payment against customer debt.
- [ ] Add tests that identified-customer pending accounts create debt debits.
- [ ] Add tests that free-name pending accounts do not create customer debt entries automatically.
- [ ] Implement customer debt ledger services in `packages/shared`.
- [ ] Add tests for unresolved line-item quantities causing `in_review`.
- [ ] Add tests for order closure with all accounts paid.
- [ ] Add tests for order closure with at least one pending account becoming `closed_with_pending`.
- [ ] Add tests proving closure does not reopen or mutate original line items.
- [ ] Add tests that an order cannot close silently with unassigned or over-assigned quantities.
- [ ] Implement closure/review decision service in `packages/shared`.
- [ ] Define `CustomerRepository` port and contract suite.
- [ ] Define `PersonalAccountRepository` port and contract suite.
- [ ] Define account allocation persistence contract suite, either as its own port or as transactional account repository methods.
- [ ] Define `CustomerDebtRepository` port and contract suite.
- [ ] Extend or replace `PaymentRepository` contract for explicit payment targets instead of `ticketId`-only payments.
- [ ] Implement mock adapters for the new ports in `apps/web/src/adapters/mock`.
- [ ] Wire new ports through `apps/web/src/composition` without feature-to-adapter imports.
- [ ] Replace or evolve split-bill UI into account assignment by customer/free-name.
- [ ] Add flows for selecting an existing customer, creating an account by free-name, and assigning quantities.
- [ ] Show unassigned quantities clearly.
- [ ] Add account-level pay-now action.
- [ ] Add account-level mark-pending action.
- [ ] Add review state UI for unresolved table closure.
- [ ] Add pending-debts screen grouped by identified customer.
- [ ] List unlinked free-name pending accounts separately.
- [ ] Support partial payment against identified customer debt without reopening the original table.
- [ ] Support payment against free-name pending accounts.
- [ ] Add link-to-existing-customer flow for free-name pending accounts.
- [ ] Add create-customer-from-free-name flow.
- [ ] Identify remaining first-class ticket terminology after personal accounts cover the behavior.
- [ ] Remove or isolate obsolete `Ticket` paths.
- [ ] Keep compatibility only where needed for historical tests or migration notes.
- [ ] Update docs to describe `PersonalAccount` as the payable unit.

## Subagent 2 — Customer debt ledger

### Structured status consumed

- schema: `gentle-ai.sdd-status@1`
- change: `personal-accounts-pending-debts`
- artifact store: `openspec`
- apply state: `ready`
- action context: `repo-local`
- workspace root: `/Users/wiliveliz/Documents/WORK/KUTANA/inventory-system`
- allowed edit roots: `/Users/wiliveliz/Documents/WORK/KUTANA/inventory-system`
- warnings: none

### Workload / PR boundary

- Selected delivery path: split into subagent-owned slices.
- Slice completed in this entry: Subagent 2 — Customer debt ledger.
- Scope boundary: `packages/shared` debt-ledger domain files and OpenSpec task/progress artifacts only.
- PR/rollback boundary: remove `packages/shared/src/billing/model/customer-debt-ledger.ts`, `packages/shared/src/billing/model/customer-debt-ledger.test.ts`, and revert the Subagent 2 task checkbox updates in this change artifact.

### Completed tasks

- [x] Add tests for append-only customer debt debit/credit entries.
- [x] Add tests for debt balance calculation from ledger entries.
- [x] Add tests for accumulating debt across multiple visits.
- [x] Add tests for partial later payment against customer debt.
- [x] Add tests that identified-customer pending accounts create debt debits.
- [x] Add tests that free-name pending accounts do not create customer debt entries automatically.
- [x] Implement customer debt ledger services in `packages/shared`.

### Files changed

- `packages/shared/src/billing/model/customer-debt-ledger.ts`
- `packages/shared/src/billing/model/customer-debt-ledger.test.ts`
- `openspec/changes/personal-accounts-pending-debts/tasks.md`
- `openspec/changes/personal-accounts-pending-debts/apply-progress.md`

### TDD Cycle Evidence

| Cycle | RED evidence | GREEN / refactor evidence |
|---|---|---|
| Customer debt ledger | `./node_modules/.bin/vitest run packages/shared/src/billing/model/customer-debt-ledger.test.ts` failed because `./customer-debt-ledger.js` did not exist. | Added framework-free append-only debt ledger functions; focused test command passed with 6 tests. |

### Test commands run

- `./node_modules/.bin/vitest run packages/shared/src/billing/model/customer-debt-ledger.test.ts` — RED failed: missing `./customer-debt-ledger.js`.
- `./node_modules/.bin/vitest run packages/shared/src/billing/model/customer-debt-ledger.test.ts` — passed: 1 file, 6 tests.
- `./node_modules/.bin/tsc --build packages/shared/tsconfig.json && ./node_modules/.bin/vitest run packages/shared/src/billing/model/customer-debt-ledger.test.ts packages/shared/src/billing/model/personal-account.test.ts` — passed: TypeScript build succeeded; 2 files, 13 tests passed.
- `./node_modules/.bin/vitest run packages/shared/src/billing/model` — passed: 3 files, 19 tests passed.

### Deviations from design

- None for this slice. Customer debt balance is derived from append-only ledger entries; no mutable balance field was introduced.
- Persistence ports, mock adapters, UI flows, and order closure are intentionally deferred to later assigned slices.

### Remaining tasks

- [ ] Add tests for unresolved line-item quantities causing `in_review`.
- [ ] Add tests for order closure with all accounts paid.
- [ ] Add tests for order closure with at least one pending account becoming `closed_with_pending`.
- [ ] Add tests proving closure does not reopen or mutate original line items.
- [ ] Add tests that an order cannot close silently with unassigned or over-assigned quantities.
- [ ] Implement closure/review decision service in `packages/shared`.
- [ ] Define `CustomerRepository` port and contract suite.
- [ ] Define `PersonalAccountRepository` port and contract suite.
- [ ] Define account allocation persistence contract suite, either as its own port or as transactional account repository methods.
- [ ] Define `CustomerDebtRepository` port and contract suite.
- [ ] Extend or replace `PaymentRepository` contract for explicit payment targets instead of `ticketId`-only payments.
- [ ] Implement mock adapters for the new ports in `apps/web/src/adapters/mock`.
- [ ] Wire new ports through `apps/web/src/composition` without feature-to-adapter imports.
- [ ] Replace or evolve split-bill UI into account assignment by customer/free-name.
- [ ] Add flows for selecting an existing customer, creating an account by free-name, and assigning quantities.
- [ ] Show unassigned quantities clearly.
- [ ] Add account-level pay-now action.
- [ ] Add account-level mark-pending action.
- [ ] Add review state UI for unresolved table closure.
- [ ] Add pending-debts screen grouped by identified customer.
- [ ] List unlinked free-name pending accounts separately.
- [ ] Support partial payment against identified customer debt without reopening the original table.
- [ ] Support payment against free-name pending accounts.
- [ ] Add link-to-existing-customer flow for free-name pending accounts.
- [ ] Add create-customer-from-free-name flow.
- [ ] Identify remaining first-class ticket terminology after personal accounts cover the behavior.
- [ ] Remove or isolate obsolete `Ticket` paths.
- [ ] Keep compatibility only where needed for historical tests or migration notes.
- [ ] Update docs to describe `PersonalAccount` as the payable unit.

## Subagent 3 — Order closure and review state

### Structured status consumed

- schema: `gentle-ai.sdd-status@1`
- change: `personal-accounts-pending-debts`
- artifact store: `openspec`
- apply state: `ready`
- action context: `repo-local`
- workspace root: `/Users/wiliveliz/Documents/WORK/KUTANA/inventory-system`
- allowed edit roots: `/Users/wiliveliz/Documents/WORK/KUTANA/inventory-system`
- warnings: none

### Workload / PR boundary

- Selected delivery path: split into subagent-owned slices.
- Slice completed in this entry: Subagent 3 — Order closure and review state.
- Scope boundary: `packages/shared` order/account lifecycle files and OpenSpec task/progress artifacts only.
- PR/rollback boundary: remove `packages/shared/src/billing/model/order-closure.ts`, `packages/shared/src/billing/model/order-closure.test.ts`, revert the `OrderStatus` additions in `packages/shared/src/ordering/model/order.ts` if no later slice depends on them, and revert the Subagent 3 task checkbox updates in this change artifact.
- Runtime harness: N/A; this slice is pure shared-domain logic with no runtime adapter boundary.

### Completed tasks

- [x] Add tests for unresolved line-item quantities causing `in_review`.
- [x] Add tests for order closure with all accounts paid.
- [x] Add tests for order closure with at least one pending account becoming `closed_with_pending`.
- [x] Add tests proving closure does not reopen or mutate original line items.
- [x] Add tests that an order cannot close silently with unassigned or over-assigned quantities.
- [x] Implement closure/review decision service in `packages/shared`.

### Files changed

- `packages/shared/src/billing/model/order-closure.ts`
- `packages/shared/src/billing/model/order-closure.test.ts`
- `packages/shared/src/ordering/model/order.ts`
- `openspec/changes/personal-accounts-pending-debts/tasks.md`
- `openspec/changes/personal-accounts-pending-debts/apply-progress.md`

### TDD Cycle Evidence

| Cycle | RED evidence | GREEN / refactor evidence |
|---|---|---|
| Order closure and review state | `./node_modules/.bin/vitest run packages/shared/src/billing/model/order-closure.test.ts` failed because `./order-closure.js` did not exist. | Added pure closure decision service and order statuses; focused test command passed with 5 tests. |

### Test commands run

- `./node_modules/.bin/vitest run packages/shared/src/billing/model/order-closure.test.ts` — RED failed: missing `./order-closure.js`.
- `./node_modules/.bin/vitest run packages/shared/src/billing/model/order-closure.test.ts` — passed: 1 file, 5 tests.
- `./node_modules/.bin/tsc --build packages/shared/tsconfig.json && ./node_modules/.bin/vitest run packages/shared/src/billing/model packages/shared/src/ordering/model/order.test.ts` — failed once for TypeScript narrowing issues in the new test/service.
- `./node_modules/.bin/tsc --build packages/shared/tsconfig.json && ./node_modules/.bin/vitest run packages/shared/src/billing/model packages/shared/src/ordering/model/order.test.ts` — passed: TypeScript build succeeded; 5 files, 34 tests passed.

### Deviations from design

- None for this slice. Closure returns `in_review` for unassigned or over-assigned quantities and `closed_with_pending` when every quantity is resolved with at least one pending account.
- Ports, adapters, UI flows, and ticket cleanup are intentionally deferred to later assigned slices.

### Remaining tasks

- [ ] Define `CustomerRepository` port and contract suite.
- [ ] Define `PersonalAccountRepository` port and contract suite.
- [ ] Define account allocation persistence contract suite, either as its own port or as transactional account repository methods.
- [ ] Define `CustomerDebtRepository` port and contract suite.
- [ ] Extend or replace `PaymentRepository` contract for explicit payment targets instead of `ticketId`-only payments.
- [ ] Implement mock adapters for the new ports in `apps/web/src/adapters/mock`.
- [ ] Wire new ports through `apps/web/src/composition` without feature-to-adapter imports.
- [ ] Replace or evolve split-bill UI into account assignment by customer/free-name.
- [ ] Add flows for selecting an existing customer, creating an account by free-name, and assigning quantities.
- [ ] Show unassigned quantities clearly.
- [ ] Add account-level pay-now action.
- [ ] Add account-level mark-pending action.
- [ ] Add review state UI for unresolved table closure.
- [ ] Add pending-debts screen grouped by identified customer.
- [ ] List unlinked free-name pending accounts separately.
- [ ] Support partial payment against identified customer debt without reopening the original table.
- [ ] Support payment against free-name pending accounts.
- [ ] Add link-to-existing-customer flow for free-name pending accounts.
- [ ] Add create-customer-from-free-name flow.
- [ ] Identify remaining first-class ticket terminology after personal accounts cover the behavior.
- [ ] Remove or isolate obsolete `Ticket` paths.
- [ ] Keep compatibility only where needed for historical tests or migration notes.
- [ ] Update docs to describe `PersonalAccount` as the payable unit.

## Subagent 4 — Ports and mock adapters

### Structured status consumed

- schema: `gentle-ai.sdd-status@1`
- change: `personal-accounts-pending-debts`
- artifact store: `openspec`
- apply state: `ready`
- action context: `repo-local`
- workspace root: `/Users/wiliveliz/Documents/WORK/KUTANA/inventory-system`
- allowed edit roots: `/Users/wiliveliz/Documents/WORK/KUTANA/inventory-system`
- warnings: none

### Workload / PR boundary

- Selected delivery path: split into subagent-owned slices.
- Slice completed in this entry: Subagent 4 — Ports and mock adapters.
- Scope boundary: shared port/model/payment compatibility files, `apps/web/src/adapters/mock`, `apps/web/src/composition`, and OpenSpec task/progress artifacts only.
- Changed-line check: slice-owned authored delta is approximately 433 lines by `git diff --numstat` plus new-file `wc -l`, under the 500-line slice authority.
- PR/rollback boundary: remove the new customer/account/debt port contracts and mock adapter files, revert explicit-target payment repository changes, revert composition port wiring, and revert the Subagent 4 task checkbox updates in this change artifact.
- Runtime harness: N/A; this slice wires in-memory adapters and composition only, with no browser scenario or backend runtime boundary.

### Completed tasks

- [x] Define `CustomerRepository` port and contract suite.
- [x] Define `PersonalAccountRepository` port and contract suite.
- [x] Define account allocation persistence contract suite, either as its own port or as transactional account repository methods.
- [x] Define `CustomerDebtRepository` port and contract suite.
- [x] Extend or replace `PaymentRepository` contract for explicit payment targets instead of `ticketId`-only payments.
- [x] Implement mock adapters for the new ports in `apps/web/src/adapters/mock`.
- [x] Wire new ports through `apps/web/src/composition` without feature-to-adapter imports.

### Files changed

- `packages/shared/src/billing/ports/customer-repository.ts`
- `packages/shared/src/billing/ports/personal-account-repository.ts`
- `packages/shared/src/billing/ports/customer-debt-repository.ts`
- `packages/shared/src/billing/ports/__contract__/customer-repository.contract.ts`
- `packages/shared/src/billing/ports/__contract__/personal-account-repository.contract.ts`
- `packages/shared/src/billing/ports/__contract__/customer-debt-repository.contract.ts`
- `packages/shared/src/payments/model/payment.ts`
- `packages/shared/src/payments/ports/payment-repository.ts`
- `packages/shared/src/payments/ports/__contract__/payment-repository.contract.ts`
- `packages/shared/src/payments/services/apply-payment.ts`
- `apps/web/src/adapters/mock/customer-repository.ts`
- `apps/web/src/adapters/mock/customer-repository.test.ts`
- `apps/web/src/adapters/mock/personal-account-repository.ts`
- `apps/web/src/adapters/mock/personal-account-repository.test.ts`
- `apps/web/src/adapters/mock/customer-debt-repository.ts`
- `apps/web/src/adapters/mock/customer-debt-repository.test.ts`
- `apps/web/src/adapters/mock/payment-repository.ts`
- `apps/web/src/composition/ports.ts`
- `apps/web/src/composition/mock.ts`
- `apps/web/src/composition/mock.test.ts`
- `apps/web/src/composition/PortsProvider.tsx`
- `apps/web/src/composition/PortsProvider.test.tsx`
- `openspec/changes/personal-accounts-pending-debts/tasks.md`
- `openspec/changes/personal-accounts-pending-debts/apply-progress.md`

### Test commands run

- `./node_modules/.bin/vitest run apps/web/src/adapters/mock/customer-repository.test.ts apps/web/src/adapters/mock/personal-account-repository.test.ts apps/web/src/adapters/mock/customer-debt-repository.test.ts apps/web/src/adapters/mock/payment-repository.test.ts apps/web/src/composition/mock.test.ts apps/web/src/composition/PortsProvider.test.tsx` — passed: 6 files, 24 tests.
- `./node_modules/.bin/vitest run apps/web/src/__tests__/composition-boundary.guard.test.ts` — passed: 1 file, 1 test.
- `./node_modules/.bin/vitest run apps/web/src/features/register/containers/RegisterPaymentContainer.test.tsx apps/web/src/features/split-bill/containers/SplitBillContainer.test.tsx` — passed: 2 files, 6 tests; existing React `act(...)` warnings were emitted by register tests.
- `./node_modules/.bin/tsc --build packages/shared/tsconfig.json` — passed.
- `./node_modules/.bin/tsc --build packages/shared/tsconfig.json apps/web/tsconfig.json` — failed on pre-existing UI exhaustiveness gaps for the new `OrderStatus` values in `OrdersOverviewContainer.tsx` and `OrderTicketPanelContainer.tsx`, which are outside this slice's allowed UI-edit boundary.
- `./node_modules/.bin/vitest run packages/shared/src/payments/services/apply-payment.test.ts apps/web/src/adapters/mock/payment-repository.test.ts` — passed: 2 files, 12 tests.
- `./node_modules/.bin/tsc --build packages/shared/tsconfig.json && ./node_modules/.bin/vitest run apps/web/src/adapters/mock/customer-repository.test.ts apps/web/src/adapters/mock/personal-account-repository.test.ts apps/web/src/adapters/mock/customer-debt-repository.test.ts apps/web/src/adapters/mock/payment-repository.test.ts apps/web/src/composition/mock.test.ts apps/web/src/composition/PortsProvider.test.tsx` — passed: TypeScript shared build succeeded; 6 files, 24 tests passed.

### Deviations from design

- `Payment.target` now supports personal-account and customer-debt targets while keeping a temporary deprecated `ticketId`/ticket target compatibility path so existing milestone-1 register flows continue to pass until later UI and cleanup slices migrate.
- Account allocation persistence is covered transactionally by `PersonalAccountRepository.save(account, allocations, expectedVersion)` instead of a separate allocation repository.

### Remaining tasks

- [ ] Replace or evolve split-bill UI into account assignment by customer/free-name.
- [ ] Add flows for selecting an existing customer, creating an account by free-name, and assigning quantities.
- [ ] Show unassigned quantities clearly.
- [ ] Add account-level pay-now action.
- [ ] Add account-level mark-pending action.
- [ ] Add review state UI for unresolved table closure.
- [ ] Add pending-debts screen grouped by identified customer.
- [ ] List unlinked free-name pending accounts separately.
- [ ] Support partial payment against identified customer debt without reopening the original table.
- [ ] Support payment against free-name pending accounts.
- [ ] Add link-to-existing-customer flow for free-name pending accounts.
- [ ] Add create-customer-from-free-name flow.
- [ ] Identify remaining first-class ticket terminology after personal accounts cover the behavior.
- [ ] Remove or isolate obsolete `Ticket` paths.
- [ ] Keep compatibility only where needed for historical tests or migration notes.
- [ ] Update docs to describe `PersonalAccount` as the payable unit.

## Subagent 5 — Account assignment UI

### Structured status consumed

- schema: `gentle-ai.sdd-status@1`
- change: `personal-accounts-pending-debts`
- artifact store: `openspec`
- apply state: `ready`
- action context: `repo-local`
- workspace root: `/Users/wiliveliz/Documents/WORK/KUTANA/inventory-system`
- allowed edit roots: `/Users/wiliveliz/Documents/WORK/KUTANA/inventory-system`
- warnings: none

### Workload / PR boundary

- Selected delivery path: split into subagent-owned slices.
- Slice completed in this entry: Subagent 5 — Account assignment UI.
- Scope boundary: `apps/web/src/features/ordering`, `apps/web/src/features/split-bill`, design-system status support, and OpenSpec task/progress artifacts.
- Changed-line check: current worktree diff for this slice area reports 778 additions and 377 deletions, but includes pre-existing foreground changes in adjacent files; this slice's account-assignment rewrite is above the preferred 500-line authority and should be reviewed as a size risk.
- PR/rollback boundary: revert the split-bill account-assignment component/container/test changes, the OrderStatus UI exhaustiveness additions, and the Subagent 5 task checkbox updates in this change artifact.
- Runtime harness: N/A; no browser runtime scenario was available in this foreground slice, so verification used React component/container tests plus the composition boundary guard.

### Completed tasks

- [x] Replace or evolve split-bill UI into account assignment by customer/free-name.
- [x] Add flows for selecting an existing customer, creating an account by free-name, and assigning quantities.
- [x] Show unassigned quantities clearly.
- [x] Add account-level pay-now action.
- [x] Add account-level mark-pending action.
- [x] Add review state UI for unresolved table closure.

### Files changed

- `apps/web/src/features/split-bill/components/SplitBillView.tsx`
- `apps/web/src/features/split-bill/components/SplitBillView.module.css`
- `apps/web/src/features/split-bill/components/SplitBillView.test.tsx`
- `apps/web/src/features/split-bill/containers/SplitBillContainer.tsx`
- `apps/web/src/features/split-bill/containers/SplitBillContainer.test.tsx`
- `apps/web/src/design-system/molecules/StatusPill.tsx`
- `apps/web/src/features/ordering/containers/OrdersOverviewContainer.tsx`
- `apps/web/src/features/ordering/containers/OrderTicketPanelContainer.tsx`
- `openspec/changes/personal-accounts-pending-debts/tasks.md`
- `openspec/changes/personal-accounts-pending-debts/apply-progress.md`

### Test commands run

- `./node_modules/.bin/vitest run apps/web/src/features/split-bill/components/SplitBillView.test.tsx apps/web/src/features/split-bill/containers/SplitBillContainer.test.tsx` — failed first while tests were being updated for controlled props/payment timing.
- `./node_modules/.bin/vitest run apps/web/src/features/split-bill/components/SplitBillView.test.tsx apps/web/src/features/split-bill/containers/SplitBillContainer.test.tsx` — passed: 2 files, 6 tests; React emitted an existing-style `act(...)` warning in one async container scenario.
- `./node_modules/.bin/tsc --build packages/shared/tsconfig.json apps/web/tsconfig.json && ./node_modules/.bin/vitest run apps/web/src/__tests__/composition-boundary.guard.test.ts apps/web/src/features/ordering/containers/OrdersOverviewContainer.test.tsx apps/web/src/features/ordering/containers/OrderTicketPanelContainer.test.tsx` — failed once on a TypeScript owner narrowing issue in `SplitBillContainer.tsx`.
- `./node_modules/.bin/tsc --build packages/shared/tsconfig.json apps/web/tsconfig.json && ./node_modules/.bin/vitest run apps/web/src/__tests__/composition-boundary.guard.test.ts apps/web/src/features/ordering/containers/OrdersOverviewContainer.test.tsx apps/web/src/features/ordering/containers/OrderTicketPanelContainer.test.tsx` — passed: TypeScript shared+web builds succeeded; boundary/ordering focused tests passed with 3 files and 5 tests; React emitted an existing-style `act(...)` warning in an order-events test.

### Deviations from design

- The migrated UI still lives under the existing `features/split-bill` route/file names as a compatibility shell, but presents and persists `PersonalAccount` assignment instead of ticket splitting.
- Customer creation itself is deferred; this slice selects existing customers from the `CustomerRepository` and creates free-name personal accounts locally.
- The account-level pay-now action records a full remaining-balance payment with the first active payment method; richer tender selection remains outside this slice.

### Remaining tasks

- [ ] Add pending-debts screen grouped by identified customer.
- [ ] List unlinked free-name pending accounts separately.
- [ ] Support partial payment against identified customer debt without reopening the original table.
- [ ] Support payment against free-name pending accounts.
- [ ] Add link-to-existing-customer flow for free-name pending accounts.
- [ ] Add create-customer-from-free-name flow.
- [ ] Identify remaining first-class ticket terminology after personal accounts cover the behavior.
- [ ] Remove or isolate obsolete `Ticket` paths.
- [ ] Keep compatibility only where needed for historical tests or migration notes.
- [ ] Update docs to describe `PersonalAccount` as the payable unit.
- `./node_modules/.bin/vitest run apps/web/src/features/split-bill/components/SplitBillView.test.tsx apps/web/src/features/split-bill/containers/SplitBillContainer.test.tsx && ./node_modules/.bin/tsc --build packages/shared/tsconfig.json apps/web/tsconfig.json && ./node_modules/.bin/vitest run apps/web/src/__tests__/composition-boundary.guard.test.ts` — passed: split-bill component/container tests passed with 2 files and 7 tests; TypeScript shared+web builds succeeded; composition boundary guard passed with 1 test; React emitted an existing-style `act(...)` warning in one async container scenario.

## Subagent 6 — Pending debts UI

### Structured status consumed

- schema: `gentle-ai.sdd-status@1`
- change: `personal-accounts-pending-debts`
- artifact store: `openspec`
- apply state: `ready`
- action context: `repo-local`
- workspace root: `/Users/wiliveliz/Documents/WORK/KUTANA/inventory-system`
- allowed edit roots: `/Users/wiliveliz/Documents/WORK/KUTANA/inventory-system`
- warnings: none

### Workload / PR boundary

- Selected delivery path: split into subagent-owned slices.
- Slice completed in this entry: Subagent 6 — Pending debts UI.
- Scope boundary: `apps/web/src/features/pending-debts`, app-shell navigation, minimal repository query seams, and OpenSpec task/progress artifacts.
- Changed-line check: new pending-debts feature files are approximately 491 lines; minimal app-shell/repository-seam edits put the slice slightly above the preferred 500-line target, so review as a size risk within the parent-approved split-slice correction authority.
- PR/rollback boundary: remove `apps/web/src/features/pending-debts`, revert the pending-debts app-shell navigation, revert the `OrderRepository.listAll` and `PersonalAccountRepository.listPendingFreeName` seam additions plus mock/contract/stub updates, and revert the Subagent 6 task checkbox updates.
- Runtime harness: N/A; no browser runtime scenario was available in this foreground slice, so verification used React container tests plus port contract tests, composition boundary guard, and TypeScript build.

### Completed tasks

- [x] Add pending-debts screen grouped by identified customer.
- [x] List unlinked free-name pending accounts separately.
- [x] Support partial payment against identified customer debt without reopening the original table.
- [x] Support payment against free-name pending accounts.
- [x] Add link-to-existing-customer flow for free-name pending accounts.
- [x] Add create-customer-from-free-name flow.

### Files changed

- `apps/web/src/features/pending-debts/components/PendingDebtsView.tsx`
- `apps/web/src/features/pending-debts/components/PendingDebtsView.module.css`
- `apps/web/src/features/pending-debts/containers/PendingDebtsContainer.tsx`
- `apps/web/src/features/pending-debts/containers/PendingDebtsContainer.test.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/app-shell/screens.ts`
- `packages/shared/src/ordering/ports/order-repository.ts`
- `packages/shared/src/ordering/ports/__contract__/order-repository.contract.ts`
- `packages/shared/src/ordering/services/version-conflict.test.ts`
- `apps/web/src/adapters/mock/order-repository.ts`
- `packages/shared/src/billing/ports/personal-account-repository.ts`
- `packages/shared/src/billing/ports/__contract__/personal-account-repository.contract.ts`
- `apps/web/src/adapters/mock/personal-account-repository.ts`
- `apps/web/src/composition/PortsProvider.test.tsx`
- `openspec/changes/personal-accounts-pending-debts/tasks.md`
- `openspec/changes/personal-accounts-pending-debts/apply-progress.md`

### Test commands run

- `./node_modules/.bin/vitest run apps/web/src/features/pending-debts/containers/PendingDebtsContainer.test.tsx` — passed: 1 file, 5 tests; React emitted existing-style `act(...)` warnings in async mutation scenarios.
- `./node_modules/.bin/tsc --build packages/shared/tsconfig.json apps/web/tsconfig.json` — failed once after adding repository query seams because existing stubs lacked the new methods; stubs were updated.
- `./node_modules/.bin/vitest run apps/web/src/features/pending-debts/containers/PendingDebtsContainer.test.tsx apps/web/src/__tests__/composition-boundary.guard.test.ts apps/web/src/app-shell/components/TopBar.test.tsx apps/web/src/App.test.tsx apps/web/src/composition/mock.test.ts apps/web/src/adapters/mock/personal-account-repository.test.ts` — passed: 6 files, 19 tests; React emitted existing-style `act(...)` warnings in pending-debts async mutation scenarios.
- `./node_modules/.bin/vitest run apps/web/src/adapters/mock/personal-account-repository.test.ts apps/web/src/adapters/mock/order-repository.test.ts` — passed: 2 files, 12 tests.
- `./node_modules/.bin/tsc --build packages/shared/tsconfig.json apps/web/tsconfig.json && ./node_modules/.bin/vitest run apps/web/src/features/pending-debts/containers/PendingDebtsContainer.test.tsx apps/web/src/adapters/mock/personal-account-repository.test.ts apps/web/src/adapters/mock/order-repository.test.ts apps/web/src/__tests__/composition-boundary.guard.test.ts` — passed: TypeScript shared+web builds succeeded; 4 files, 18 tests passed; React emitted existing-style `act(...)` warnings in pending-debts async mutation scenarios.

### Deviations from design

- The pending-debts read model is assembled in the frontend container from existing ports plus two minimal query seams: `OrderRepository.listAll()` and `PersonalAccountRepository.listPendingFreeName()`.
- Customer-debt payments record both an explicit customer-debt payment target and an append-only credit ledger entry; they do not save or reopen the original order.
- Free-name pending account payments target the personal account directly; free-name entries are only linked when the operator explicitly chooses an existing customer or creates a new customer from the free name.

### Remaining tasks

- [ ] Identify remaining first-class ticket terminology after personal accounts cover the behavior.
- [ ] Remove or isolate obsolete `Ticket` paths.
- [ ] Keep compatibility only where needed for historical tests or migration notes.
- [ ] Update docs to describe `PersonalAccount` as the payable unit.

## Subagent 7 — Ticket terminology cleanup and compatibility removal

### Structured status consumed

- schema: `gentle-ai.sdd-status@1`
- change: `personal-accounts-pending-debts`
- artifact store: `openspec`
- apply state: `ready`
- action context: `repo-local`
- workspace root: `/Users/wiliveliz/Documents/WORK/KUTANA/inventory-system`
- allowed edit roots: `/Users/wiliveliz/Documents/WORK/KUTANA/inventory-system`
- warnings: none

### Workload / PR boundary

- Selected delivery path: split into subagent-owned slices.
- Slice completed in this entry: Subagent 7 — Ticket terminology cleanup and compatibility removal.
- Scope boundary: ticket/allocation compatibility annotations, obsolete split-bill compatibility files, current app copy, docs, focused tests, and OpenSpec task/progress artifacts.
- Changed-line check: slice-owned surgical cleanup is below the 400-line review budget when excluding prior subagent work already present in the dirty worktree.
- PR/rollback boundary: restore `apps/web/e2e/split-bill.spec.ts`, `apps/web/src/features/split-bill/components/BillPanel.tsx`, and `BillPanel.module.css`; revert the account/payable terminology edits in app/docs/shared compatibility comments; revert Subagent 7 task checkbox updates.
- Runtime harness: N/A; no browser runtime scenario was available in this foreground slice, so verification used TypeScript, focused unit/component tests, and full Vitest with noted tooling limitation.

### Completed tasks

- [x] Identify remaining first-class ticket terminology after personal accounts cover the behavior.
- [x] Remove or isolate obsolete `Ticket` paths.
- [x] Keep compatibility only where needed for historical tests or migration notes.
- [x] Update docs to describe `PersonalAccount` as the payable unit.

### Files changed

- `README.md`
- `docs/sdd/resuming-work.md`
- `docs/sdd/tasks-v1.md`
- `apps/web/e2e/split-bill.spec.ts` (removed obsolete ticket E2E)
- `apps/web/src/App.tsx`
- `apps/web/src/composition/ports.ts`
- `apps/web/src/composition/PortsProvider.tsx`
- `apps/web/src/design-system/molecules/ButtonRow.tsx`
- `apps/web/src/design-system/molecules/LineItemRow.tsx`
- `apps/web/src/design-system/molecules/Panel.test.tsx`
- `apps/web/src/features/ordering/components/OrderTicketPanel.tsx`
- `apps/web/src/features/ordering/components/OrderTicketPanel.test.tsx`
- `apps/web/src/features/ordering/components/RegisterWorkspace.test.tsx`
- `apps/web/src/features/ordering/containers/OrderTicketPanelContainer.tsx`
- `apps/web/src/features/register/components/RegisterPaymentPanel.tsx`
- `apps/web/src/features/register/containers/RegisterPaymentContainer.tsx`
- `apps/web/src/features/split-bill/components/BillPanel.tsx` (removed unused obsolete component)
- `apps/web/src/features/split-bill/components/BillPanel.module.css` (removed unused obsolete styles)
- `apps/web/src/features/split-bill/components/ConflictBanner.tsx`
- `apps/web/src/features/split-bill/containers/SplitBillContainer.tsx`
- `packages/shared/src/billing/model/allocation.ts`
- `packages/shared/src/billing/model/ticket.ts`
- `packages/shared/src/billing/services/split-allocation.ts`
- `openspec/changes/personal-accounts-pending-debts/tasks.md`
- `openspec/changes/personal-accounts-pending-debts/apply-progress.md`

### Test commands run

- `./node_modules/.bin/tsc --build packages/shared/tsconfig.json apps/web/tsconfig.json && ./node_modules/.bin/vitest run apps/web/src/App.test.tsx apps/web/src/features/ordering/components/RegisterWorkspace.test.tsx apps/web/src/features/ordering/components/OrderTicketPanel.test.tsx apps/web/src/features/ordering/containers/OrderTicketPanelContainer.test.tsx apps/web/src/features/split-bill/components/SplitBillView.test.tsx apps/web/src/features/split-bill/containers/SplitBillContainer.test.tsx apps/web/src/features/register/containers/RegisterPaymentContainer.test.tsx apps/web/src/features/pending-debts/containers/PendingDebtsContainer.test.tsx apps/web/src/__tests__/composition-boundary.guard.test.ts apps/web/src/design-system/molecules/Panel.test.tsx` — failed first because one renamed RegisterWorkspace test assertion still expected `ticket view`.
- `./node_modules/.bin/tsc --build packages/shared/tsconfig.json apps/web/tsconfig.json && ./node_modules/.bin/vitest run apps/web/src/App.test.tsx apps/web/src/features/ordering/components/RegisterWorkspace.test.tsx apps/web/src/features/ordering/components/OrderTicketPanel.test.tsx apps/web/src/features/ordering/containers/OrderTicketPanelContainer.test.tsx apps/web/src/features/split-bill/components/SplitBillView.test.tsx apps/web/src/features/split-bill/containers/SplitBillContainer.test.tsx apps/web/src/features/register/containers/RegisterPaymentContainer.test.tsx apps/web/src/features/pending-debts/containers/PendingDebtsContainer.test.tsx apps/web/src/__tests__/composition-boundary.guard.test.ts apps/web/src/design-system/molecules/Panel.test.tsx` — passed: TypeScript shared+web builds succeeded; 10 files and 28 tests passed; React emitted existing-style `act(...)` warnings in async container scenarios.
- `./node_modules/.bin/vitest run` — failed only in existing `packages/shared/src/__tests__/architecture-boundary.test.ts` because that test shells out to `pnpm` and this environment reports `spawnSync pnpm ENOENT`; 67 files and 293 tests passed before the tooling failure.
- `corepack enable pnpm && command -v pnpm && pnpm --version` — passed: enabled the pnpm shim needed by the existing architecture-boundary test; pnpm 10.11.0 available.
- `./node_modules/.bin/vitest run` — passed after enabling the pnpm shim: 68 files and 294 tests passed; React emitted existing-style `act(...)` warnings in async container scenarios.

### Deviations from design

- Legacy `Ticket`, `Allocation`, `TicketRepository`, and ticket payment tests remain isolated as deprecated milestone-1 compatibility because the current register whole-table payment path and historical tests still exercise them.
- Obsolete split-bill-only artifacts that no longer match the personal-account UI were removed rather than migrated.

### Remaining tasks

- None for implementation-owned SDD apply tasks in this change.
