import { test, expect } from '@playwright/test';
import { AUTH_FILES } from '../_helpers/auth.helper';

test.describe('[SUB] Tạo tờ trình MS', () => {
  test.use({ storageState: AUTH_FILES.staff });

  test('TC-SUB-010: Tạo tờ trình MS — lưu nháp thành công', async ({ page }) => {
    // ARRANGE
    await page.goto('/submissions/new');

    // ACT — chọn loại MS
    await page.getByRole('combobox', { name: /loại tờ trình/i }).click();
    await page.getByRole('option', { name: /MS|mua sắm/i }).click();

    // Chọn bộ phận IT
    await page.getByRole('combobox', { name: /bộ phận/i }).click();
    await page.getByRole('option', { name: /IT/i }).click();

    // Điền thông tin chung
    await page.getByLabel(/tiêu đề/i).fill('[AUTO] Mua máy tính xách tay');
    await page.getByLabel(/nội dung/i).fill('Cần mua máy tính cho nhân viên mới onboard.');

    // Thêm dòng chi phí
    await page.getByRole('button', { name: /thêm dòng chi phí/i }).click();
    await page.getByRole('combobox', { name: /mã phí/i }).first().click();
    await page.getByRole('option').first().click();

    const supplierInputs = page.getByPlaceholder(/nhà cung cấp/i);
    await supplierInputs.first().fill('Công ty ABC');
    const amountInputs = page.locator('input[type="number"]');
    await amountInputs.nth(0).fill('10000000');
    await amountInputs.nth(1).fill('11000000');

    // Lưu nháp
    await page.getByRole('button', { name: /lưu nháp/i }).click();

    // ASSERT
    await expect(page).toHaveURL(/\/submissions\/[a-zA-Z0-9-]+$/);
    await expect(page.getByText(/đã lưu nháp|đã tạo tờ trình/i)).toBeVisible({ timeout: 5000 });
    // Code dạng MS00XX
    await expect(page.getByText(/MS\d{4}/)).toBeVisible();
  });

  test('TC-SUB-013: Lỗi — để trống title', async ({ page }) => {
    // ARRANGE
    await page.goto('/submissions/new');

    // ACT — không điền title, submit
    await page.getByLabel(/nội dung/i).fill('Nội dung test');
    await page.getByRole('button', { name: /gửi tờ trình|lưu nháp/i }).first().click();

    // ASSERT — vẫn ở trang tạo, thấy lỗi validation
    await expect(page).toHaveURL(/\/submissions\/new/);
    await expect(page.getByText(/tiêu đề bắt buộc|bắt buộc/i)).toBeVisible();
  });

  test('TC-SUB-015: Thêm và xóa dòng chi phí', async ({ page }) => {
    // ARRANGE
    await page.goto('/submissions/new');
    await page.getByRole('combobox', { name: /loại tờ trình/i }).click();
    await page.getByRole('option', { name: /MS|mua sắm/i }).click();

    // ACT — thêm 3 dòng
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /thêm dòng chi phí/i }).click();
    }

    // Xóa dòng thứ 2 (index 1)
    const deleteButtons = page.getByRole('button', { name: /×|xóa dòng/i });
    await deleteButtons.nth(1).click();

    // ASSERT — còn 2 dòng
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(2);
  });
});
