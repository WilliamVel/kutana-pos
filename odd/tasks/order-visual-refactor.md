# Order visual refactor

- [x] Refine order header, tabs, line items, summary, and action bar using existing tokens.
- [x] Replace the split menu with an accessible responsive popover/bottom sheet while preserving callbacks.
- [x] Improve payment loading, success, failure, retry, and focus states without changing payment logic.
- [x] Add focused interaction/accessibility tests and verify responsive styles.
- [ ] Run typecheck, lint, focused tests, and full suite; record limitations.

## Verification

- `pnpm typecheck`: passed.
- Focused tests: passed (28 tests), including split-menu focus restoration, line-item accessibility, and payment retry behavior.
- `pnpm test`: passed (513 tests); 59 PostgreSQL adapter tests skipped because `DATABASE_URL` is unavailable.
- `pnpm lint`: blocked by pre-existing unused `displayQuantity` in `apps/web/src/features/catalog/components/ProductForm.tsx`, which is outside this change.
- `git diff --check`: passed.
- Manual browser verification was not run in this worktree.

## Follow-up: payment review modal

- [x] Rename the primary action to `Cobrar` and separate the visible amount while preserving the accessible label.
- [x] Clarify `Saldo restante`, add helper context, align monetary values, and compact modal spacing.
- [x] Add responsive bottom-sheet action layout, safe-area padding, Escape handling, focus return, and focus trapping.
- [x] Prevent duplicate review submissions and preserve existing selected-product/payment callbacks.
- [x] Focused review modal tests and typecheck pass.
