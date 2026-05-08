import { test, expect } from '@playwright/test';
import { AUTH_FILES } from '../_helpers/auth.helper';

test.describe('[SUB] Tạo tờ trình NT', () => {
  test.use({ storageState: AUTH_FILES.staff });

  test('TC-SUB-020: Tạo tờ trình NT — lưu nháp thành công', async ({ page }) => {
    // ARRANGE
    await page.goto('/submissions/new');

    // ACT — chọn loại NT
    await page.getByRole('combobox', { name: /loại tờ trình/i }).click();
    await page.getByRole('option', { name: /NT|nội thất|nguyên tắc/i }).click();

    // Chọn bộ phận
    await page.getByRole('combobox', { name: /bộ phận/i }).click();
    await page.getByRole('option', { name: /IT/i }).click();

    // Điền thông tin chung
    await page.getByLabel(/tiêu đề/i).fill('[AUTO] Mua bàn ghế văn phòng');
    await page.getByLabel(/nội dung/i).fill('Cần bổ sung bàn ghế cho nhân viên mới.');

    // Thông tin hợp đồng NT
    await page.getByLabel(/nhà cung cấp/i).fill('Công ty Nội Thất XYZ');
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill('2026-05-10');
    await dateInputs.nth(1).fill('2026-06-10');

    // Lưu nháp
    await page.getByRole('button', { name: /lưu nháp/i }).click();

    // ASSERT
    await expect(page).toHaveURL(/\/submissions\/[a-zA-Z0-9-]+$/);
    await expect(page.getByText(/đã lưu nháp|đã tạo tờ trình/i)).toBeVisible({ timeout: 5000 });
    // Code dạng NT00XX
    await expect(page.getByText(/NT\d{4}/)).toBeVisible();
  });

  test('TC-SUB-021: NT — ngày bắt đầu sau ngày kết thúc báo lỗi', async ({ page }) => {
    // ARRANGE
    await page.goto('/submissions/new');
    await page.getByRole('combobox', { name: /loại tờ trình/i }).click();
    await page.getByRole('option', { name: /NT|nội thất|nguyên tắc/i }).click();

    await page.getByLabel(/tiêu đề/i).fill('[AUTO] Test ngày hợp đồng');

    // ACT — nhập ngày bắt đầu > ngày kết thúc
    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill('2026-07-01');
    await dateInputs.nth(1).fill('2026-06-01');
    await page.getByRole('button', { name: /lưu nháp/i }).click();

    // ASSERT — còn ở trang tạo, thấy lỗi
    await expect(page).toHaveURL(/\/submissions\/new/);
    await expect(page.getByText(/ngày kết thúc|không hợp lệ|phải sau/i)).toBeVisible();
  });

  test('TC-SUB-022: NT — upload file đính kèm hợp đồng', async ({ page }) => {
    // ARRANGE
    await page.goto('/submissions/new');
    await page.getByRole('combobox', { name: /loại tờ trình/i }).click();
    await page.getByRole('option', { name: /NT|nội thất|nguyên tắc/i }).click();

    await page.getByLabel(/tiêu đề/i).fill('[AUTO] Test upload file NT');
    await page.getByLabel(/nội dung/i).fill('Test đính kèm hợp đồng');

    // ACT — upload file
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      await fileInput.first().setInputFiles({
        name: 'hop-dong-test.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('PDF content placeholder'),
      });

      // ASSERT — tên file xuất hiện
      await expect(page.getByText(/hop-dong-test\.pdf/i)).toBeVisible({ timeout: 5000 });
    }
  });
});
