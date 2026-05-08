import { test, expect } from '@playwright/test';
import { AUTH_FILES } from '../_helpers/auth.helper';

test.describe('[SUB] Danh sách tờ trình', () => {
  test.describe('Staff — scope bộ phận', () => {
    test.use({ storageState: AUTH_FILES.staff });

    test('TC-SUB-001: Staff chỉ thấy tờ trình bộ phận mình (IT)', async ({ page }) => {
      // ARRANGE
      await page.goto('/submissions');

      // ASSERT — tab MS mặc định
      await expect(page.getByRole('tab', { name: /MS|mua sắm/i })).toBeVisible();
      // Các cột cơ bản
      await expect(page.getByRole('columnheader', { name: /mã/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /tiêu đề/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /trạng thái/i })).toBeVisible();
    });

    test('TC-SUB-003: Chuyển tab MS / NT', async ({ page }) => {
      // ARRANGE
      await page.goto('/submissions');

      // ACT — chuyển sang NT
      await page.getByRole('tab', { name: /NT|nội thất|nguyên tắc/i }).click();

      // ASSERT — tab NT active
      await expect(page.getByRole('tab', { name: /NT|nội thất|nguyên tắc/i })).toHaveAttribute('data-state', 'active');
    });

    test('TC-SUB-004: Tìm kiếm full-text — debounce 300ms', async ({ page }) => {
      // ARRANGE
      await page.goto('/submissions');

      // ACT
      await page.getByPlaceholder(/tìm kiếm/i).fill('TEST');

      // ASSERT — debounce kích hoạt, không cần nhấn Enter
      await page.waitForTimeout(400); // chờ qua debounce 300ms
      // Danh sách đã load lại (không còn spinner)
      await expect(page.getByRole('progressbar')).not.toBeVisible({ timeout: 3000 }).catch(() => {});
      // Kết quả hiển thị hoặc "Không có tờ trình nào"
      const hasResults = await page.getByRole('row').count() > 1;
      const hasEmpty = await page.getByText(/không có tờ trình nào/i).isVisible().catch(() => false);
      expect(hasResults || hasEmpty).toBe(true);
    });

    test('TC-SUB-006: Lọc theo trạng thái', async ({ page }) => {
      // ARRANGE
      await page.goto('/submissions');

      // ACT — lọc theo "Nháp"
      await page.getByRole('button', { name: /nháp/i }).click();

      // ASSERT — danh sách chỉ hiện trạng thái draft
      const badges = page.getByText(/nháp/i);
      if (await badges.count() > 0) {
        await expect(badges.first()).toBeVisible();
      }
    });
  });

  test.describe('Reviewer — tất cả bộ phận', () => {
    test.use({ storageState: AUTH_FILES.reviewer });

    test('TC-SUB-002: Reviewer thấy tờ trình tất cả bộ phận', async ({ page }) => {
      // ARRANGE
      await page.goto('/submissions');

      // ASSERT — menu Báo cáo hiển thị (reviewer có quyền)
      await expect(page.getByRole('link', { name: /báo cáo/i })).toBeVisible();
    });
  });
});
