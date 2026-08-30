import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Load-bearing architectural guard (design.md "Placement rules"): anything
 * importing @nestjs/*, react, pg, or performing I/O CANNOT live in
 * packages/shared. This test proves the ESLint `no-restricted-imports` rule
 * actually fires on a violating fixture, not just that the rule text exists.
 */
describe("packages/shared architectural boundary", () => {
  it("fails ESLint when a fixture file imports @nestjs/common", () => {
    const repoRoot = path.resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
    const fixturePath = path.join(
      repoRoot,
      "packages/shared/src/__lint-fixtures__/violating-nestjs-import.fixture.ts.txt",
    );
    const tempPath = fixturePath.replace(/\.ts\.txt$/, ".ts");

    fs.copyFileSync(fixturePath, tempPath);

    try {
      let failed = false;
      let output = "";
      try {
        output = execFileSync("pnpm", ["exec", "eslint", "--no-ignore", tempPath], {
          cwd: repoRoot,
          encoding: "utf-8",
        });
      } catch (error) {
        failed = true;
        output = String((error as { stdout?: string }).stdout ?? error);
      }

      expect(failed).toBe(true);
      expect(output).toMatch(/no-restricted-imports/);
    } finally {
      fs.rmSync(tempPath, { force: true });
    }
  });
});
