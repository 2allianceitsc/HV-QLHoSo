import { test, expect } from '@playwright/test';
import { AUTH_FILES } from '../_helpers/auth.helper';

test.describe('[ADM] Quản lý bộ phận', () => {
  test.use({ storageState: AUTH_FILES.admin });

  test('TC-ADM-010a: Admin xem danh sách bộ phận', async ({ page }) => {
    // ARRANGE
    await page.goto('/admin/departments');

    // ASSERT
    await expect(page.getByRole('columnheader', { name: /tên bộ phận/i })).toBeVisible();
    // Dữ liệu seed: IT, Kế toán, Marketing, ...
    await expect(page.getByText(/IT/)).toBeVisible();
  });

  test('TC-ADM-010b: Tạo bộ phận mới', async ({ page }) => {
    // ARRANGE
    await page.goto('/admin/departments');
    const ts = Date.now();

    // ACT
    await page.getByRole('button', { name: /tạo|thêm bộ phận/i }).click();
    await page.getByLabel(/tên bộ phận/i).fill(`[AUTO] Phòng Test ${ts}`);
    await page.getByRole('button', { name: /lưu|tạo/i }).last().click();

    // ASSERT
    await expect(page.getByText(/đã tạo|thành công/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(`[AUTO] Phòng Test ${ts}`)).toBeVisible();
  });

  test('TC-ADM-010c: Xóa bộ phận — confirm dialog', async ({ page }) => {
    // ARRANGE — tạo trước để xóa
    await page.goto('/admin/departments');
    await page.getByRole('button', { name: /tạo|thêm bộ phận/i }).click();
    await page.getByLabel(/tên bộ phận/i).fill('[AUTO] Phòng Sẽ Xóa');
    await page.getByRole('button', { name: /lưu|tạo/i }).last().click();
    await page.waitForTimeout(500);

    // ACT — xóa dòng vừa tạo
    const targetRow = page.getByRole('row', { name: /Phòng Sẽ Xóa/i });
    await targetRow.getByRole('button', { name: /xóa/i }).click();

    // ASSERT — confirm dialog
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /xác nhận|xóa/i }).last().click();

    // Dòng biến mất
    await expect(page.getByText(/Phòng Sẽ Xóa/)).not.toBeVisible({ timeout: 5000 });
  });
});
