import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./src/tests/e2e",
  // Warm up (compile) every route once before the suite — see global-setup.ts.
  globalSetup: "./src/tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // 1 local retry absorbs the one-off cold-compile of a route by the dev server
  // (webpack cache is disabled in next.config.ts, so first hits are slow).
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  // Generous timeout: the dev server compiles each route on first request.
  timeout: 240_000,

  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    navigationTimeout: 120_000,
    actionTimeout: 30_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true, // re-use if already running locally
    timeout: 120_000,
  },
});
