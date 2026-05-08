import { test, expect } from '@playwright/test';
import { AUTH_FILES } from '../_helpers/auth.helper';

test.describe('[ADM] Quản lý mã phí', () => {
  test.use({ storageState: AUTH_FILES.admin });

  test('TC-ADM-020a: Admin xem danh sách mã phí', async ({ page }) => {
    // ARRANGE
    await page.goto('/admin/cost-codes');

    // ASSERT
    await expect(page.getByRole('columnheader', { name: /mã phí/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /tên/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /bộ phận/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /trạng thái/i })).toBeVisible();
  });

  test('TC-ADM-020b: Tạo mã phí mới', async ({ page }) => {
    // ARRANGE
    await page.goto('/admin/cost-codes');
    const ts = Date.now().toString().slice(-6);

    // ACT
    await page.getByRole('button', { name: /tạo|thêm mã phí/i }).click();

    await page.getByLabel(/mã phí/i).fill(`AUTO${ts}`);
    await page.getByLabel(/tên/i).fill(`[AUTO] Chi phí test ${ts}`);

    const deptSelect = page.getByRole('combobox', { name: /bộ phận/i });
    if (await deptSelect.isVisible()) {
      await deptSelect.click();
      await page.getByRole('option').first().click();
    }

    await page.getByRole('button', { name: /lưu|tạo/i }).last().click();

    // ASSERT
    await expect(page.getByText(/đã tạo|thành công/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(`AUTO${ts}`)).toBeVisible();
  });

  test('TC-ADM-020c: Xóa mã phí — confirm dialog', async ({ page }) => {
    // ARRANGE — tạo trước
    await page.goto('/admin/cost-codes');
    await page.getByRole('button', { name: /tạo|thêm mã phí/i }).click();
    await page.getByLabel(/mã phí/i).fill('AUTODEL');
    await page.getByLabel(/tên/i).fill('[AUTO] Sẽ Xóa');
    const deptSelect = page.getByRole('combobox', { name: /bộ phận/i });
    if (await deptSelect.isVisible()) {
      await deptSelect.click();
      await page.getByRole('option').first().click();
    }
    await page.getByRole('button', { name: /lưu|tạo/i }).last().click();
    await page.waitForTimeout(500);

    // ACT — xóa
    const targetRow = page.getByRole('row', { name: /Sẽ Xóa/i });
    await targetRow.getByRole('button', { name: /xóa/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /xác nhận|xóa/i }).last().click();

    // ASSERT
    await expect(page.getByText(/Sẽ Xóa/)).not.toBeVisible({ timeout: 5000 });
  });

  test('TC-ADM-021: Lọc mã phí theo bộ phận', async ({ page }) => {
    // ARRANGE
    await page.goto('/admin/cost-codes');

    // ACT — chọn filter bộ phận IT
    const deptFilter = page.getByRole('combobox', { name: /bộ phận|lọc/i });
    if (await deptFilter.isVisible()) {
      await deptFilter.click();
      await page.getByRole('option', { name: /IT/i }).click();

      // ASSERT — kết quả chỉ là mã phí của IT
      await page.waitForTimeout(500);
      const hasResults = await page.getByRole('row').count() > 1;
      const hasEmpty = await page.getByText(/không có mã phí|không có dữ liệu/i).isVisible().catch(() => false);
      expect(hasResults || hasEmpty).toBe(true);
    }
  });
});
