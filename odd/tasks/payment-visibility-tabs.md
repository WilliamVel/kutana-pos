# Payment visibility tabs

## Scope
Show pending products by default in the POS ticket, expose Pagados only when fully paid rows exist, and keep paid-account product details hidden in split-bill without changing totals or payment/allocation contracts.

## Decisions
- POS: Pendientes is the default view. Fully paid aggregate rows appear only under Pagados. Partial rows remain under Pendientes only.
- Split-bill: payments are account-level, so exact product-level paid classification is not inferred. Fully paid accounts hide assigned product rows; open/partially paid accounts remain visible.
- All summaries continue using complete persisted/order/account data.

## Evidence
- Focused POS and split-bill tests: 33 passed.
- Web build, typecheck, lint, diff check, and Prettier: passed.
- Full web suite: one intermittent failure in `SplitBillContainer.test.tsx`; the same focused container test passed (7/7), with existing React act warnings.
