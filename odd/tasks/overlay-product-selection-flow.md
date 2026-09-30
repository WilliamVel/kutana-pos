# Overlay product-selection payment flow

## Goal
Render the Cobrar productos flow inside the same fullscreen overlay used by account splitting, so every Dividir option has a clear bounded workspace and exit control.

## Tasks
- [x] Move product selection mode into the fullscreen overlay without duplicating the order panel.
- [x] Add a clear overlay title/close behavior and keep selection state safe.
- [x] Add focused regression coverage for product-selection overlay rendering and exit.
- [x] Run focused checks and commit the work unit.

## Non-goals
- Do not change product payment allocation or checkout behavior.
- Do not change the Parts iguales/Por monto split domain flow.

## Evidence
- Focused App/Register tests: 16 passed.
- `pnpm typecheck`: passed.
- Product selection now uses the same fullscreen overlay and closes back to the account view while clearing draft selections.
