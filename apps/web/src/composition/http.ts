import type { Ports } from "./ports.js";

/**
 * Milestone-2 wiring. Deliberately NOT implemented yet: milestone 1 is
 * frontend-first and ships with zero backend dependency (see design.md
 * "Local-first deployment" and the v1 scope decision on frontend-first
 * delivery). `buildHttpPorts()` will construct the same `Ports` shape from
 * `apps/web/src/adapters/http/*` (fetch + WebSocket implementations of the
 * exact same port interfaces as the mocks) once `apps/api` exists.
 *
 * TODO(milestone-2): implement fetch/WebSocket adapters under
 * `apps/web/src/adapters/http/` and replace this stub. Until then, setting
 * `VITE_ADAPTER=http` is not a supported way to run this app.
 */
export function buildHttpPorts(): Ports {
  throw new Error(
    "buildHttpPorts() is not implemented yet. HTTP/WebSocket adapters land at " +
      "milestone 2 alongside apps/api. Run without VITE_ADAPTER=http (or unset " +
      "it) to use the milestone-1 mock adapters instead.",
  );
}
