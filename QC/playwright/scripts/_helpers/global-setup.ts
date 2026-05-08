import { chromium } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:5418';

const ROLES = [
  { username: 'hungnt',  password: process.env.TEST_STAFF_PASSWORD!,    file: 'QC/.auth/staff.json' },
  { username: 'tanvt',   password: process.env.TEST_REVIEWER_PASSWORD!,  file: 'QC/.auth/reviewer.json' },
  { username: 'hongdv',  password: process.env.TEST_APPROVER_PASSWORD!,  file: 'QC/.auth/approver.json' },
  { username: 'admin',   password: process.env.TEST_ADMIN_PASSWORD!,     file: 'QC/.auth/admin.json' },
];

export default async function globalSetup() {
  // Ensure .auth dir exists (relative to repo root)
  const authDir = path.join(process.cwd(), 'QC', '.auth');
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  const browser = await chromium.launch({ headless: false }); // headless:false để quan sát

  for (const role of ROLES) {
    console.log(`[setup] Logging in as ${role.username}...`);
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/login`);

    await page.getByLabel(/username/i).fill(role.username);
    await page.locator('input[type="password"]').fill(role.password);
    await page.getByRole('button', { name: /sign in|đăng nhập/i }).click();

    // Chờ rời khỏi /login
    await page.waitForURL(url => !url.href.includes('/login'), { timeout: 15_000 });
    console.log(`[setup] After login, URL: ${page.url()}`);

    // Xử lý first-time-password
    if (page.url().includes('first-time-password') || page.url().includes('change-password')) {
      console.log(`[setup] First-time-password detected for ${role.username}`);

      await page.getByTestId('first-time-password-new-password').fill(role.password);
      await page.getByTestId('first-time-password-confirm-password').fill(role.password);
      await page.getByTestId('first-time-password-submit').click();

      // Chờ navigate ra khỏi first-time-password (bất kỳ URL nào)
      await page.waitForURL(url => !url.href.includes('first-time-password') && !url.href.includes('change-password'), { timeout: 15_000 });
      console.log(`[setup] After password change, URL: ${page.url()}`);
    }

    // Nếu chưa ở /submissions (vd: ở '/' hoặc '/setup-2fa'), navigate thẳng
    if (!page.url().includes('/submissions')) {
      await page.goto(`${BASE_URL}/submissions`);
      await page.waitForURL('**/submissions', { timeout: 10_000 });
    }

    console.log(`[setup] ${role.username} ready, saving session...`);
    await page.context().storageState({ path: role.file });
    await page.close();
  }

  await browser.close();
}
