import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 5174);
const baseURL = `http://127.0.0.1:${PORT}`;

// Playwright 同梱の Chromium を落とせない環境向けの逃げ道。
// PLAYWRIGHT_CHROMIUM_EXECUTABLE に既存の Chromium のパスを渡すとそれを使う。
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  // 端末プリセット。スマホ表示とPC表示を同じテストで検証する。
  // mobile-small は iPhone SE 相当で、レイアウトが最初に壊れる幅。
  projects: [
    { name: "mobile-small", use: { ...devices["Pixel 5"], viewport: { width: 320, height: 568 } } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
