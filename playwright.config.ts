import { defineConfig, devices } from "@playwright/test";

// Smoke tests run against the Vite dev server in Chromium. The Tauri side is replaced by the
// fake backend in tests/e2e/support. Own port (not 1420, used by `tauri dev`) and never reuse a
// running server: it could be serving another checkout.
const PORT = Number(process.env.E2E_PORT ?? 1440);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    locale: "es-ES",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
