import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    // `e2e/**` holds Playwright specs (real browser E2E, task 11.6) — a
    // completely separate runner/config (`playwright.config.ts`), not
    // Vitest/jsdom component tests. Exclude them here so `pnpm test` and
    // `pnpm --filter web test:e2e` stay two distinct, non-overlapping
    // commands.
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
  },
});
