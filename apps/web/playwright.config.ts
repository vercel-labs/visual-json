import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Never serve the html report in CI: there is nobody to open it, and waiting
  // on it keeps the run alive after the tests finish.
  reporter: process.env.CI ? [["html", { open: "never" }]] : "html",
  use: {
    baseURL: "http://visual-json.localhost:1355",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command:
      "portless proxy start --no-tls -p 1355 && portless visual-json next dev --turbopack",
    url: "http://visual-json.localhost:1355",
    reuseExistingServer: !process.env.CI,
    // portless runs the dev server in its own process group, which a SIGKILL of the
    // web server command doesn't reach, so stop it with SIGTERM and let portless
    // pass it on. Otherwise the dev server keeps Playwright's output open and the
    // run never finishes.
    gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
  },
});
