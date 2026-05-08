import { test, expect } from '@playwright/test';
import { AUTH_FILES } from '../_helpers/auth.helper';

test.describe('[ADM] Cấu hình phân quyền duyệt', () => {
  test.use({ storageState: AUTH_FILES.admin });

  test('TC-ADM-030: Admin xem cấu hình phân quyền tất cả bộ phận', async ({ page }) => {
    // ARRANGE
    await page.goto('/admin/approval-config');

    // ASSERT — mỗi bộ phận có dòng cấu hình
    await expect(page.getByText(/IT/)).toBeVisible();
    // Dropdown reviewer và approver hiển thị
    const reviewerSelects = page.getByRole('combobox', { name: /reviewer|người thẩm định/i });
    await expect(reviewerSelects.first()).toBeVisible();
  });

  test('TC-ADM-031: Cập nhật reviewer cho bộ phận IT', async ({ page }) => {
    // ARRANGE
    await page.goto('/admin/approval-config');

    // ACT — tìm row IT, đổi reviewer
    const itRow = page.locator('tr', { hasText: /\bIT\b/ }).first();
    const reviewerSelect = itRow.getByRole('combobox', { name: /reviewer|người thẩm định/i });
    if (await reviewerSelect.isVisible()) {
      await reviewerSelect.click();
      // Chọn option đầu tiên (khác với hiện tại)
      await page.getByRole('option').first().click();
    }

    // Lưu row IT
    await itRow.getByRole('button', { name: /lưu/i }).click();

    // ASSERT
    await expect(page.getByText(/đã lưu cấu hình/i)).toBeVisible({ timeout: 5000 });
  });

  test('TC-ADM-032: Cập nhật approver cho bộ phận IT', async ({ page }) => {
    // ARRANGE
    await page.goto('/admin/approval-config');

    // ACT — tìm row IT, đổi approver
    const itRow = page.locator('tr', { hasText: /\bIT\b/ }).first();
    const approverSelect = itRow.getByRole('combobox', { name: /approver|người phê duyệt/i });
    if (await approverSelect.isVisible()) {
      await approverSelect.click();
      await page.getByRole('option').last().click();
    }

    await itRow.getByRole('button', { name: /lưu/i }).click();

    // ASSERT
    await expect(page.getByText(/đã lưu cấu hình/i)).toBeVisible({ timeout: 5000 });
  });
});
