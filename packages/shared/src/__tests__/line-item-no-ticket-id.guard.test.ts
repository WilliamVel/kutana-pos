import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard test (static half) — encodes risk #1 from the proposal: a future
 * contributor "simplifying" Allocation into a plain FK on LineItem would
 * silently destroy the fractional-splitting seam. Scans every source file
 * under `ordering/` for a `ticketId`/`ticket_id` field declaration, so this
 * fails loudly whether it is added to the type, a factory, or a future
 * port — not just to the currently-known interface. Lives under
 * `__tests__/` (I/O-import exempt) because it is test tooling, not domain
 * code — see `architecture-boundary.test.ts` for the same pattern.
 */
describe("LineItem source files never declare a ticketId/ticket_id field", () => {
  it("scans ordering/ for ticketId or ticket_id declarations", () => {
    const orderingSrcDir = new URL("../ordering", import.meta.url).pathname;
    const violations: string[] = [];

    function walk(dir: string): void {
      for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath);
          continue;
        }
        if (!entry.endsWith(".ts") || entry.endsWith(".test.ts")) {
          continue;
        }
        const content = readFileSync(fullPath, "utf-8");
        if (/ticket_id|ticketId\s*[?:]/i.test(content)) {
          violations.push(fullPath);
        }
      }
    }

    walk(orderingSrcDir);

    expect(violations).toEqual([]);
  });
});
