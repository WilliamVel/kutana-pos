import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Payment methods are DATA, not code (design decision: "Payment methods as
 * a registry, not a domain enum"). This guard statically scans every
 * non-test source file in `packages/shared` for the literal string 'CASH'
 * (single- or double-quoted) and fails if it appears anywhere OUTSIDE the
 * registry seed file. If this guard ever fails, a domain file has started
 * branching on a specific payment method code instead of asking the
 * registry for behavior — exactly the coupling the registry design exists
 * to prevent.
 */
function collectSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("payments: no hardcoded 'CASH' literal outside the registry seed", () => {
  it("finds the literal only in the seed file", () => {
    const srcRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
    const seedFile = path.join(srcRoot, "payments/model/payment-method-registry.seed.ts");

    const violations: string[] = [];
    for (const file of collectSourceFiles(srcRoot)) {
      if (file === seedFile) continue;
      if (file.endsWith(".test.ts")) continue;
      const contents = fs.readFileSync(file, "utf-8");
      if (/['"]CASH['"]/.test(contents)) {
        violations.push(file);
      }
    }

    expect(violations).toEqual([]);
  });
});
