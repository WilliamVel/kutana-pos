import { defineConfig, devices } from "@playwright/test";

/**
 * Milestone-1 E2E config: runs entirely against the mock-adapter build
 * (`vite preview` over the production `dist/`, no `apps/api` involvement —
 * see design.md "Testing Strategy": E2E against the mock adapter build in
 * m1, against the real stack in m2). `webServer` builds+serves the app so
 * `pnpm --filter web test:e2e` is a single self-contained command.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm exec vite preview --port 4173 --strictPort --host 127.0.0.1",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env["CI"],
    timeout: 60_000,
  },
});
