# Tasks: Personal accounts and pending debts

This task list is implementation planning only. Do not start apply until the proposal, spec, and design are approved.

## Accepted architecture decision

`PersonalAccount` is the future primary payable unit. `Ticket` is milestone-1 terminology and should be deprecated rather than preserved as a parallel domain abstraction.

Implementation should use subagents by slice. Each subagent owns one bounded work unit, produces tests/evidence, and returns a concise result before the parent routes the next slice.

## Subagent plan

### Subagent 1 — Domain accounts and quantity allocation

Scope: `packages/shared` only.

Skills to load before work:

- `/Users/wiliveliz/.claude/skills/work-unit-commits/SKILL.md`

Tasks:

- [x] Add tests for `Customer` creation and identity assumptions.
- [x] Add tests for `PersonalAccount` owner invariants: identified customer or free-name, never neither, never both.
- [x] Add tests for quantity-level `AccountLineAllocation`.
- [x] Add tests rejecting over-allocation beyond the source line-item quantity.
- [x] Add tests proving allocation is by quantity only, not arbitrary amount.
- [x] Add tests for personal account total/paid/remaining calculations.
- [x] Add tests for account status derivation: open, partially_paid, pending, paid.
- [x] Implement the pure domain models and services in `packages/shared`.

Acceptance evidence:

- Focused shared-domain tests pass.
- No React, NestJS, adapter, or I/O imports enter `packages/shared`.

### Subagent 2 — Customer debt ledger

Scope: `packages/shared` only.

Skills to load before work:

- `/Users/wiliveliz/.claude/skills/work-unit-commits/SKILL.md`

Tasks:

- [x] Add tests for append-only customer debt debit/credit entries.
- [x] Add tests for debt balance calculation from ledger entries.
- [x] Add tests for accumulating debt across multiple visits.
- [x] Add tests for partial later payment against customer debt.
- [x] Add tests that identified-customer pending accounts create debt debits.
- [x] Add tests that free-name pending accounts do not create customer debt entries automatically.
- [x] Implement customer debt ledger services in `packages/shared`.

Acceptance evidence:

- Focused debt tests pass.
- Debt balance is derived from ledger entries, not stored as a mutable balance.

### Subagent 3 — Order closure and review state

Scope: `packages/shared` order/account services.

Skills to load before work:

- `/Users/wiliveliz/.claude/skills/work-unit-commits/SKILL.md`

Tasks:

- [x] Add tests for unresolved line-item quantities causing `in_review`.
- [x] Add tests for order closure with all accounts paid.
- [x] Add tests for order closure with at least one pending account becoming `closed_with_pending`.
- [x] Add tests proving closure does not reopen or mutate original line items.
- [x] Add tests that an order cannot close silently with unassigned or over-assigned quantities.
- [x] Implement closure/review decision service in `packages/shared`.

Acceptance evidence:

- Focused order/account lifecycle tests pass.
- Existing immutable line-item guarantees remain intact.

### Subagent 4 — Ports and mock adapters

Scope: shared ports plus `apps/web/src/adapters/mock` and composition only.

Skills to load before work:

- `/Users/wiliveliz/.claude/skills/work-unit-commits/SKILL.md`

Tasks:

- [x] Define `CustomerRepository` port and contract suite.
- [x] Define `PersonalAccountRepository` port and contract suite.
- [x] Define account allocation persistence contract suite, either as its own port or as transactional account repository methods.
- [x] Define `CustomerDebtRepository` port and contract suite.
- [x] Extend or replace `PaymentRepository` contract for explicit payment targets instead of `ticketId`-only payments.
- [x] Implement mock adapters for the new ports in `apps/web/src/adapters/mock`.
- [x] Wire new ports through `apps/web/src/composition` without feature-to-adapter imports.

Acceptance evidence:

- Port contract suites pass against mock adapters.
- Composition boundary guard still passes.

### Subagent 5 — Account assignment UI

Scope: `apps/web/src/features/ordering`, `apps/web/src/features/split-bill`, and design-system components only as needed.

Skills to load before work:

- `/Users/wiliveliz/.claude/skills/work-unit-commits/SKILL.md`

Tasks:

- [x] Replace or evolve split-bill UI into account assignment by customer/free-name.
- [x] Add flows for selecting an existing customer, creating an account by free-name, and assigning quantities.
- [x] Show unassigned quantities clearly.
- [x] Add account-level pay-now action.
- [x] Add account-level mark-pending action.
- [x] Add review state UI for unresolved table closure.

Acceptance evidence:

- Presentational component tests cover account assignment and unresolved quantities.
- Container tests prove the UI uses ports only.

### Subagent 6 — Pending debts UI

Scope: `apps/web/src/features/pending-debts`, app shell navigation, and composition wiring.

Skills to load before work:

- `/Users/wiliveliz/.claude/skills/work-unit-commits/SKILL.md`

Tasks:

- [x] Add pending-debts screen grouped by identified customer.
- [x] List unlinked free-name pending accounts separately.
- [x] Support partial payment against identified customer debt without reopening the original table.
- [x] Support payment against free-name pending accounts.
- [x] Add link-to-existing-customer flow for free-name pending accounts.
- [x] Add create-customer-from-free-name flow.

Acceptance evidence:

- Tests prove debt payment does not reopen original orders.
- Tests prove free-name entries are not automatically merged.

### Subagent 7 — Ticket terminology cleanup and compatibility removal

Scope: references to `Ticket`, `Allocation`, and split-bill compatibility paths.

Skills to load before work:

- `/Users/wiliveliz/.claude/skills/work-unit-commits/SKILL.md`

Tasks:

- [x] Identify remaining first-class ticket terminology after personal accounts cover the behavior.
- [x] Remove or isolate obsolete `Ticket` paths.
- [x] Keep compatibility only where needed for historical tests or migration notes.
- [x] Update docs to describe `PersonalAccount` as the payable unit.

Acceptance evidence:

- Full test suite passes.
- Domain terminology no longer presents `Ticket` as the future payable abstraction.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 1600-2600 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 7 subagent-owned slices listed above |
| Delivery strategy | ask-on-risk |
| Decision needed before apply | Yes |

## Apply gate

Before implementation starts, the parent session should launch the smallest safe subagent slice first: **Subagent 1 — Domain accounts and quantity allocation**.

Do not launch UI subagents before the domain and port contracts exist. Do not preserve `Ticket` as a parallel business concept; only use temporary compatibility when required to keep intermediate slices compiling.
