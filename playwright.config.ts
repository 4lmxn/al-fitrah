import { defineConfig, devices } from "@playwright/test";

// Port is configurable so the suite never silently reuses whatever unrelated
// dev server happens to hold :3000 (reuseExistingServer can't tell them apart).
const PORT = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL },
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
