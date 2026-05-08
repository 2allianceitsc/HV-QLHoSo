import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env từ QC/.env (override với DEV/.env nếu cần)
dotenv.config({ path: path.join(__dirname, '.env') });

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:5418';

export default defineConfig({
  testDir: './playwright/scripts',
  outputDir: './playwright/results',
  fullyParallel: false, // sequential để tránh race condition trên DB test
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright/report', open: 'never' }],
  ],
  globalSetup: './playwright/scripts/_helpers/global-setup.ts',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    // httpCredentials — không cần, dùng cookie auth
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Timeout mặc định cho từng test
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
});
