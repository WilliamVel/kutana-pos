# Resilient fast order updates

## Goal
Keep order entry responsive when products are added rapidly and prevent the receiving order screen from reloading once per event.

## Tasks
- [x] Coalesce rapid order events in the receiving order panel with a short debounce while preserving the latest snapshot.
- [x] Replace per-item success toasts with a compact, grouped feedback message and retain undo behavior.
- [x] Add focused tests for event coalescing and grouped toast behavior.
- [x] Run the relevant web test suite and inspect the final diff.

## Follow-up tasks
- [x] Replace the growing grouped toast action list with a compact, non-blocking inline feedback control.
- [x] Add Playwright coverage at mobile and desktop widths for rapid additions and catalog visibility.
- [x] Keep feedback visible while mobile users scroll through the product grid, without changing document flow.
- [x] Prevent deletion feedback from causing layout shift or scroll movement.
- [x] Remove the empty mobile feedback reservation while keeping visible feedback non-blocking.
- [x] Restore deletion success to Sonner with stable identity and scroll-safe presentation.

## Decisions
- Do not delay persistence of order items.
- Use a 400 ms coalescing window for receiver refreshes.
- Reduce visual interruption by grouping rapid additions in one toast.
- Do not render one undo button per item inside a toast; rapid feedback must never cover the catalog.
