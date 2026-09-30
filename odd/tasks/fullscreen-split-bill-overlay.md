# Fullscreen split-bill overlay

## Goal
Present account splitting as a focused fullscreen overlay with clear exit controls and prevent split mode from leaking across orders.

## Tasks
- [x] Render split-bill in a responsive fullscreen overlay with internal scrolling and accessible close behavior.
- [x] Keep the split flow bound to its order and block accidental order switching until exit.
- [x] Add regression coverage for overlay/close behavior and order context protection.
- [x] Run focused checks and commit the work unit.

## Scope
- App-level register navigation, split-bill presentation, and focused tests/styles.

## Non-goals
- Do not change split allocation/payment domain logic.
- Do not discard persisted assignments when closing the overlay.

## Evidence
- App/RegisterWorkspace focused tests: 15 passed.
- Split-flow focused suite: 35 passed.
- `pnpm typecheck`: passed.
- `git diff --check`: passed.
- Overlay locks body scroll, locks order selection, supports visible close and Escape, and resets stale center state when navigating away from Register.
