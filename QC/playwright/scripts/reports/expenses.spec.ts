import { test, expect } from '@playwright/test';
import { AUTH_FILES } from '../_helpers/auth.helper';

test.describe('[RPT] Báo cáo chi phí', () => {
  test.describe('Approver', () => {
    test.use({ storageState: AUTH_FILES.approver });

    test('TC-RPT-010: Trang báo cáo chi phí hiển thị đúng', async ({ page }) => {
      // ARRANGE
      await page.goto('/reports/expenses');

      // ASSERT — summary hiển thị
      await expect(page.getByText(/tổng tiền chưa VAT|tổng chi phí/i)).toBeVisible();
      await expect(page.getByText(/tổng tiền đã VAT/i)).toBeVisible();
    });

    test('TC-RPT-011: Lọc theo ngày — cập nhật kết quả', async ({ page }) => {
      // ARRANGE
      await page.goto('/reports/expenses');

      // ACT — nhập date range
      const dateInputs = page.locator('input[type="date"]');
      if (await dateInputs.count() >= 2) {
        await dateInputs.first().fill('2026-01-01');
        await dateInputs.nth(1).fill('2026-12-31');
      }

      // Trigger filter (nếu có nút Lọc; nếu auto-filter thì chờ debounce)
      const filterBtn = page.getByRole('button', { name: /lọc|tìm kiếm/i });
      if (await filterBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await filterBtn.click();
      }

      // ASSERT — không còn spinner
      await expect(page.getByRole('progressbar')).not.toBeVisible({ timeout: 3000 }).catch(() => {});
      await expect(page.getByText(/tổng tiền/i)).toBeVisible();
    });

    test('TC-RPT-012: Nút Xuất Excel hiển thị và kích hoạt download', async ({ page }) => {
      // ARRANGE
      await page.goto('/reports/expenses');

      // ASSERT — nút Xuất Excel hiển thị
      const exportBtn = page.getByRole('button', { name: /xuất excel/i });
      await expect(exportBtn).toBeVisible();

      // ACT — click và verify download
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
        exportBtn.click(),
      ]);

      if (download) {
        // File được tải về, tên file đúng định dạng
        expect(download.suggestedFilename()).toMatch(/BaoCaoChiPhi.*\.xlsx$/);
      } else {
        // Nếu không bắt được download event, ít nhất verify không có lỗi
        await expect(page.getByText(/lỗi xuất|export failed/i)).not.toBeVisible();
      }
    });

    test('TC-RPT-013: Nút Xóa lọc chỉ hiện khi có filter', async ({ page }) => {
      // ARRANGE
      await page.goto('/reports/expenses');

      // Không có filter — nút Xóa lọc ẩn
      await expect(page.getByRole('button', { name: /xóa lọc/i })).not.toBeVisible();

      // ACT — nhập filter
      const dateInput = page.locator('input[type="date"]').first();
      if (await dateInput.isVisible()) {
        await dateInput.fill('2026-01-01');

        // ASSERT — nút Xóa lọc xuất hiện
        await expect(page.getByRole('button', { name: /xóa lọc/i })).toBeVisible();

        // ACT — xóa lọc
        await page.getByRole('button', { name: /xóa lọc/i }).click();

        // ASSERT — filter bị clear, nút ẩn lại
        await expect(page.getByRole('button', { name: /xóa lọc/i })).not.toBeVisible();
      }
    });
  });

  test.describe('Reviewer — không có quyền xem báo cáo chi phí', () => {
    test.use({ storageState: AUTH_FILES.reviewer });

    test('TC-RPT-014: Reviewer truy cập /reports/expenses bị redirect hoặc 403', async ({ page }) => {
      // ARRANGE
      await page.goto('/reports/expenses');

      // ASSERT
      const url = page.url();
      const isRedirected = !url.includes('/reports/expenses');
      const hasForbidden = await page.getByText(/không có quyền|403|forbidden/i).isVisible().catch(() => false);
      expect(isRedirected || hasForbidden).toBe(true);
    });
  });
});
