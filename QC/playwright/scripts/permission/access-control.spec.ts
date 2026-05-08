import { test, expect } from '@playwright/test';
import { AUTH_FILES } from '../_helpers/auth.helper';

// Helpers
async function assertRedirectOrForbidden(page: ReturnType<typeof test['info']> extends never ? never : import('@playwright/test').Page, path: string) {
  await page.goto(path);
  const url = page.url();
  const isRedirected = !url.endsWith(path.replace(/\?.*/, ''));
  const hasForbidden = await page.getByText(/không có quyền|403|forbidden/i).isVisible().catch(() => false);
  expect(isRedirected || hasForbidden).toBe(true);
}

// ─── STAFF ────────────────────────────────────────────────────────────────────
test.describe('[PERM] Staff — giới hạn quyền', () => {
  test.use({ storageState: AUTH_FILES.staff });

  test('TC-PERM-001: Staff thấy menu Tờ trình, không thấy Báo cáo', async ({ page }) => {
    await page.goto('/submissions');
    await expect(page.getByRole('link', { name: /tờ trình/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /báo cáo/i })).not.toBeVisible();
  });

  test('TC-PERM-002: Staff không vào được /reports', async ({ page }) => {
    await page.goto('/reports');
    const url = page.url();
    expect(url).not.toContain('/reports');
  });

  test('TC-PERM-003: Staff không vào được /reports/expenses', async ({ page }) => {
    await page.goto('/reports/expenses');
    const url = page.url();
    expect(url).not.toContain('/reports/expenses');
  });

  test('TC-PERM-004: Staff không vào được /admin/users', async ({ page }) => {
    await page.goto('/admin/users');
    const url = page.url();
    expect(url).not.toContain('/admin/users');
  });

  test('TC-PERM-005: Staff không vào được /admin/cost-codes', async ({ page }) => {
    await page.goto('/admin/cost-codes');
    const url = page.url();
    expect(url).not.toContain('/admin/cost-codes');
  });

  test('TC-PERM-006: Staff không vào được /admin/approval-config', async ({ page }) => {
    await page.goto('/admin/approval-config');
    const url = page.url();
    expect(url).not.toContain('/admin/approval-config');
  });

  test('TC-PERM-007: Staff không thấy nút Thẩm định trên detail page', async ({ page }) => {
    // Dùng một submission ở trạng thái pending_review (phải có trong DB test)
    await page.goto('/submissions');
    const pendingLink = page.getByText(/chờ thẩm định/i).first();
    if (await pendingLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pendingLink.click();
      await expect(page.getByRole('button', { name: /thẩm định/i })).not.toBeVisible();
    }
  });
});

// ─── REVIEWER ─────────────────────────────────────────────────────────────────
test.describe('[PERM] Reviewer — quyền xem báo cáo tổng hợp', () => {
  test.use({ storageState: AUTH_FILES.reviewer });

  test('TC-PERM-010: Reviewer thấy menu Báo cáo', async ({ page }) => {
    await page.goto('/submissions');
    await expect(page.getByRole('link', { name: /báo cáo/i })).toBeVisible();
  });

  test('TC-PERM-011: Reviewer vào được /reports', async ({ page }) => {
    await page.goto('/reports');
    await expect(page).toHaveURL(/\/reports/);
    await expect(page.getByText(/tổng tờ trình/i)).toBeVisible();
  });

  test('TC-PERM-012: Reviewer không vào được /reports/expenses', async ({ page }) => {
    await page.goto('/reports/expenses');
    const url = page.url();
    expect(url).not.toContain('/reports/expenses');
  });

  test('TC-PERM-013: Reviewer không vào được /admin/*', async ({ page }) => {
    await page.goto('/admin/users');
    const url = page.url();
    expect(url).not.toContain('/admin/users');
  });

  test('TC-PERM-014: Reviewer thấy nút Thẩm định trên submission pending_review', async ({ page }) => {
    await page.goto('/submissions');
    const pendingLink = page.getByText(/chờ thẩm định/i).first();
    if (await pendingLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pendingLink.click();
      await expect(page.getByRole('button', { name: /thẩm định/i })).toBeVisible();
    }
  });

  test('TC-PERM-015: Reviewer không thấy nút Phê duyệt', async ({ page }) => {
    await page.goto('/submissions');
    const inReviewLink = page.getByText(/đang duyệt/i).first();
    if (await inReviewLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await inReviewLink.click();
      await expect(page.getByRole('button', { name: /phê duyệt/i })).not.toBeVisible();
    }
  });
});

// ─── APPROVER ─────────────────────────────────────────────────────────────────
test.describe('[PERM] Approver — quyền báo cáo chi phí', () => {
  test.use({ storageState: AUTH_FILES.approver });

  test('TC-PERM-020: Approver vào được /reports/expenses', async ({ page }) => {
    await page.goto('/reports/expenses');
    await expect(page).toHaveURL(/\/reports\/expenses/);
    await expect(page.getByText(/tổng tiền/i)).toBeVisible();
  });

  test('TC-PERM-021: Approver không vào được /admin/users', async ({ page }) => {
    await page.goto('/admin/users');
    const url = page.url();
    expect(url).not.toContain('/admin/users');
  });

  test('TC-PERM-022: Approver thấy nút Phê duyệt trên submission in_review', async ({ page }) => {
    await page.goto('/submissions');
    const inReviewLink = page.getByText(/đang duyệt/i).first();
    if (await inReviewLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await inReviewLink.click();
      await expect(page.getByRole('button', { name: /phê duyệt/i })).toBeVisible();
    }
  });
});

// ─── ADMIN ────────────────────────────────────────────────────────────────────
test.describe('[PERM] Admin — toàn quyền', () => {
  test.use({ storageState: AUTH_FILES.admin });

  test('TC-PERM-030: Admin vào được /admin/users', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.getByRole('columnheader', { name: /tên đăng nhập|username/i })).toBeVisible();
  });

  test('TC-PERM-031: Admin vào được /admin/approval-config', async ({ page }) => {
    await page.goto('/admin/approval-config');
    await expect(page).toHaveURL(/\/admin\/approval-config/);
  });
});
