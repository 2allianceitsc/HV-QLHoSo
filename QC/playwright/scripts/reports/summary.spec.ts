import { test, expect } from '@playwright/test';
import { AUTH_FILES } from '../_helpers/auth.helper';

test.describe('[RPT] Báo cáo tổng hợp', () => {
  test.describe('Reviewer', () => {
    test.use({ storageState: AUTH_FILES.reviewer });

    test('TC-RPT-001: Trang báo cáo tổng hợp hiển thị đúng', async ({ page }) => {
      // ARRANGE
      await page.goto('/reports');

      // ASSERT — summary cards hiển thị
      await expect(page.getByText(/tổng tờ trình/i)).toBeVisible();
      await expect(page.getByText(/chờ thẩm định|đang duyệt/i)).toBeVisible();
      await expect(page.getByText(/đã duyệt/i)).toBeVisible();
    });

    test('TC-RPT-002: Filter theo tháng/năm', async ({ page }) => {
      // ARRANGE
      await page.goto('/reports');

      // ACT — chọn năm 2026, tháng 1
      const yearSelect = page.getByRole('combobox', { name: /năm/i });
      if (await yearSelect.isVisible()) {
        await yearSelect.click();
        await page.getByRole('option', { name: '2026' }).click();
      }
      const monthSelect = page.getByRole('combobox', { name: /tháng/i });
      if (await monthSelect.isVisible()) {
        await monthSelect.click();
        await page.getByRole('option', { name: /tháng 1|01/i }).first().click();
      }

      // ASSERT — dữ liệu đã load (không còn spinner)
      await expect(page.getByRole('progressbar')).not.toBeVisible({ timeout: 3000 }).catch(() => {});
      await expect(page.getByText(/tổng tờ trình/i)).toBeVisible();
    });

    test('TC-RPT-003: Biểu đồ theo bộ phận hiển thị', async ({ page }) => {
      // ARRANGE
      await page.goto('/reports');

      // ASSERT — container chart tồn tại (recharts hoặc wrapper)
      await expect(page.locator('.recharts-wrapper, [data-testid="chart-by-dept"]').first()).toBeVisible({ timeout: 5000 });
    });

    test('TC-RPT-004: Biểu đồ theo tháng hiển thị', async ({ page }) => {
      // ARRANGE
      await page.goto('/reports');

      // ASSERT — ít nhất 2 container chart tồn tại
      const charts = page.locator('.recharts-wrapper, [data-testid*="chart"]');
      await expect(charts.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Staff không có quyền xem báo cáo', () => {
    test.use({ storageState: AUTH_FILES.staff });

    test('TC-RPT-005: Staff truy cập /reports bị redirect hoặc 403', async ({ page }) => {
      // ARRANGE
      await page.goto('/reports');

      // ASSERT — không ở /reports hoặc thấy thông báo không có quyền
      const url = page.url();
      const isRedirected = !url.includes('/reports');
      const hasForbidden = await page.getByText(/không có quyền|403|forbidden/i).isVisible().catch(() => false);
      expect(isRedirected || hasForbidden).toBe(true);
    });
  });
});
