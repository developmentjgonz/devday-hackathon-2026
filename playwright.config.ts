import { defineConfig } from '@playwright/test'

const baseURL = process.env.UI_TEST_BASE_URL ?? 'http://127.0.0.1:6006'
const outputDir = process.env.UI_TEST_OUTPUT_DIR ?? `test-results/run-${process.pid}`
process.env.UI_TEST_OUTPUT_DIR = outputDir

export default defineConfig({
  testDir: './tests/ui',
  fullyParallel: true,
  workers: 2,
  outputDir,
  use: {
    baseURL,
    launchOptions: {
      executablePath: '/Users/admin/.local/bin/eday-secure-chrome',
      chromiumSandbox: true,
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'light', use: { colorScheme: 'light' } },
    { name: 'dark', use: { colorScheme: 'dark' } },
  ],
  webServer: process.env.UI_TEST_BASE_URL ? undefined : {
    command: 'npm run storybook',
    url: 'http://127.0.0.1:6006/iframe.html',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
