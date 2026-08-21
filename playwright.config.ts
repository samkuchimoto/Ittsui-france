import { defineConfig, devices } from "@playwright/test";

// Starts `next dev` itself before running tests (reuses an already-running
// one locally so this doesn't fight a dev server you already have open),
// and tears it down after. No real Firebase sign-in is simulated here —
// these tests check the unauthenticated default state of each page
// resolves within a bound time, not the full authenticated product.
export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
