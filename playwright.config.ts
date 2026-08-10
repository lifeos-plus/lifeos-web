import { defineConfig, devices } from "@playwright/test";

const apiPort = process.env.E2E_API_PORT ?? "8765";
const webPort = process.env.E2E_WEB_PORT ?? "5173";
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${webPort}`;

/**
 * E2E baseline for the LifeOS Web UI core loop.
 *
 * The browser tests run against a real LifeOS Web API (lifeos-cli) backed by a
 * throwaway SQLite database so the exercised HTTP transport matches the pinned
 * OpenAPI contract instead of a mock. `scripts/e2e/start-api.sh` bootstraps that
 * server in an isolated HOME and never touches the developer's database.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  outputDir: "test-results",
  use: {
    baseURL,
    locale: "en-US",
    timezoneId: "UTC",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: `bash scripts/e2e/start-api.sh --port ${apiPort}`,
      url: `http://127.0.0.1:${apiPort}/api/v1/areas/`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${webPort} --strictPort`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        E2E_API_PROXY_TARGET: `http://127.0.0.1:${apiPort}`,
      },
    },
  ],
});
