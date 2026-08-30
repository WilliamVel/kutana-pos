import { execFileSync } from "node:child_process";
import { fileURLToPath, URL as NodeURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Load-bearing composition-root guard (design.md "Composition-root DI on
 * the web"): a feature that imports a concrete adapter directly defeats the
 * entire frontend-first swap strategy, because swapping mock for HTTP at
 * milestone 2 would then require touching every such feature file instead
 * of the single line in main.tsx. This test proves the ESLint
 * `no-restricted-imports` rule actually fires on a violating fixture, not
 * just that the rule text exists in eslint.config.js.
 */
describe("apps/web features/** must not import adapters/** directly", () => {
  it("fails ESLint when a feature file imports a concrete mock adapter", () => {
    const repoRoot = path.resolve(fileURLToPath(new NodeURL("../../../../", import.meta.url)));
    const fixturePath = path.join(
      repoRoot,
      "apps/web/src/features/__lint-fixtures__/violating-adapter-import.fixture.tsx.txt",
    );
    const tempPath = fixturePath.replace(/\.tsx\.txt$/, ".tsx");

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
