# Fix overlay scrolling

## Goal
Make the fullscreen split/product-selection overlay content scrollable within its bounded viewport while keeping the header fixed.

## Tasks
- [x] Give the overlay content flexible growth and internal vertical scrolling.
- [x] Add focused structural regression coverage.
- [x] Run focused checks and commit the work unit.

## Evidence
- RegisterWorkspace tests: 8 passed.
- `git diff --check`: passed.
