import { defineWorkspace } from "vitest/config";

/**
 * One test runner (Vitest) for the whole monorepo, three projects.
 * See design decision "Vitest for the whole monorepo".
 */
export default defineWorkspace([
  {
    test: {
      name: "shared",
      root: "./packages/shared",
      environment: "node",
      globals: true,
      include: ["src/**/*.test.ts"],
    },
  },
  "./apps/api/vitest.config.ts",
  "./apps/web/vitest.config.ts",
]);
