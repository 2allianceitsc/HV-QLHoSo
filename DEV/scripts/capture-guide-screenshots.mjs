// One-off script to (re)capture screenshots for the "Hướng dẫn sử dụng" guide page.
// Captures each screenshot with testaccount's hvRoles temporarily scoped to exactly
// the role(s) relevant to that image, so the sidebar doesn't leak unrelated menu items
// (e.g. a "staff" illustration must not show the "Quản trị" nav group).
//
// Run with dev server already up (pnpm dev), and playwright installed (see /tmp/pw-scratch).
// Usage: node scripts/capture-guide-screenshots.mjs

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../apps/web/public/guide-assets');
mkdirSync(OUT_DIR, { recursive: true });

const BASE_URL = 'http://localhost:5418';
const USERNAME = 'testaccount';
const PASSWORD = 'HV@1234!';
const STAFF_ID = '019fa6a3-5808-7278-9ca6-2e97a458b171';
const DEPARTMENT_ID = '019e96ad-4086-7086-8e32-e3d9092df59e';
const COST_CODE_ID = '019e96ad-5154-7020-9136-5ee9c07d268d';
const FULL_ROLES = ['staff', 'reviewer', 'approver', 'admin'];

// Legacy SUPER_ADMIN account (seeded) — used only to scope/restore testaccount's hvRoles.
// It bypasses HvRoleGuard regardless of testaccount's own hvRoles at the time, so it stays
// usable even while testaccount is deliberately downgraded for a screenshot batch.
const SUPER_ADMIN_USERNAME = 'superadmin';
const SUPER_ADMIN_PASSWORD = 'Admin@123!';

async function apiLoginCookieHeader(username, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(`api login failed: ${res.status}`);
  const cookies = res.headers.getSetCookie().map((c) => c.split(';')[0]);
  return cookies.join('; ');
}

async function setHvRoles(adminCookieHeader, roles) {
  const res = await fetch(`${BASE_URL}/api/admin/users/${STAFF_ID}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookieHeader },
    body: JSON.stringify({ hvRoles: roles }),
  });
  if (!res.ok) throw new Error(`setHvRoles(${roles.join(',')}) failed: ${res.status} ${await res.text()}`);
  console.log('hvRoles set to', roles);
}

// Create a real submission (as testaccount, staff-scoped) so the guide list/detail
// screenshots show actual content instead of an empty table. Then reassign its first
// pending approval step to testaccount so it also shows up in the reviewer/approver queue.
async function createIllustrativeSubmission(staffCookieHeader, adminCookieHeader) {
  const res = await fetch(`${BASE_URL}/api/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: staffCookieHeader },
    body: JSON.stringify({
      type: 'MS',
      action: 'submit',
      departmentId: DEPARTMENT_ID,
      costCodeId: COST_CODE_ID,
      submittedDate: new Date().toISOString().slice(0, 10),
      title: 'Ví dụ tờ trình minh họa hướng dẫn sử dụng',
      content: 'Tờ trình mẫu dùng để chụp ảnh minh họa cho trang Hướng dẫn sử dụng.',
    }),
  });
  if (!res.ok) throw new Error(`create submission failed: ${res.status} ${await res.text()}`);
  const { data: submission } = await res.json();
  console.log('created illustrative submission', submission.code);

  const firstPendingStep = (submission.approvalSteps ?? []).find((s) => ['pending', 'in_progress'].includes(s.status));
  if (firstPendingStep) {
    const reassignRes = await fetch(
      `${BASE_URL}/api/submissions/${submission.id}/steps/${firstPendingStep.id}/reassign`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookieHeader },
        body: JSON.stringify({ newApproverId: STAFF_ID, reason: 'Chụp ảnh minh họa hướng dẫn sử dụng' }),
      },
    );
    if (!reassignRes.ok) {
      console.warn('reassign step failed (non-fatal):', reassignRes.status, await reassignRes.text());
    } else {
      console.log('reassigned first pending step to testaccount');
    }
  }
  return submission;
}

async function withScopedBrowser(browser, fn) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE_URL}/login`);
  await page.fill('#username', USERNAME);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/submissions/, { timeout: 15000 });
  await page.waitForTimeout(800);
  await fn(page);
  await page.close();
}

async function shoot(page, urlPath, filename) {
  await page.goto(`${BASE_URL}${urlPath}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () => !document.body.innerText.includes('Đang tải'),
    { timeout: 10000 },
  ).catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: true });
  console.log('captured', filename);
}

async function main() {
  const adminCookieHeader = await apiLoginCookieHeader(SUPER_ADMIN_USERNAME, SUPER_ADMIN_PASSWORD);
  const browser = await chromium.launch();

  try {
    // ── Nhân viên (staff only) ──────────────────────────────────────────────
    await setHvRoles(adminCookieHeader, ['staff']);
    const staffCookieHeader = await apiLoginCookieHeader(USERNAME, PASSWORD);
    const submission = await createIllustrativeSubmission(staffCookieHeader, adminCookieHeader);

    await withScopedBrowser(browser, async (page) => {
      await shoot(page, '/submissions', 'staff-submission-list.png');
      await shoot(page, '/submissions/new', 'staff-submission-create.png');
      await shoot(page, `/submissions/${submission.id}`, 'staff-submission-detail.png');
    });

    // ── Thẩm định / Phê duyệt (reviewer + approver only) ────────────────────
    await setHvRoles(adminCookieHeader, ['reviewer', 'approver']);
    await withScopedBrowser(browser, async (page) => {
      await shoot(page, '/submissions', 'reviewer-submission-list.png');
      await shoot(page, `/submissions/${submission.id}`, 'reviewer-submission-detail.png');
    });

    // ── Quản trị (admin only) ────────────────────────────────────────────────
    await setHvRoles(adminCookieHeader, ['admin']);
    await withScopedBrowser(browser, async (page) => {
      await shoot(page, '/admin/users', 'admin-users.png');
      await shoot(page, '/admin/departments', 'admin-departments.png');
      await shoot(page, '/admin/cost-codes', 'admin-cost-codes.png');
      await shoot(page, '/admin/submission-statuses', 'admin-statuses.png');
      await shoot(page, '/admin/approval-rules', 'admin-approval-rules.png');
    });
  } finally {
    await browser.close();
    await setHvRoles(adminCookieHeader, FULL_ROLES);
  }

  console.log('Done. Screenshots saved to', OUT_DIR);
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
