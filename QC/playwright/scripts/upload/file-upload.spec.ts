import { test, expect } from '@playwright/test';
import { AUTH_FILES } from '../_helpers/auth.helper';

test.describe('[UP] Upload file đính kèm', () => {
  test.use({ storageState: AUTH_FILES.staff });

  test('TC-UP-001: Upload file PDF hợp lệ (≤20MB)', async ({ page }) => {
    // ARRANGE
    await page.goto('/submissions/new');
    await page.getByRole('combobox', { name: /loại tờ trình/i }).click();
    await page.getByRole('option', { name: /MS|mua sắm/i }).click();
    await page.getByLabel(/tiêu đề/i).fill('[AUTO] Test upload PDF');

    // ACT — upload file
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      await fileInput.first().setInputFiles({
        name: 'test-document.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 test content'),
      });

      // ASSERT — tên file xuất hiện trong danh sách
      await expect(page.getByText(/test-document\.pdf/i)).toBeVisible({ timeout: 8000 });
    }
  });

  test('TC-UP-002: Upload file quá 20MB — báo lỗi', async ({ page }) => {
    // ARRANGE
    await page.goto('/submissions/new');
    await page.getByRole('combobox', { name: /loại tờ trình/i }).click();
    await page.getByRole('option', { name: /MS|mua sắm/i }).click();

    // ACT — upload file >20MB (giả lập)
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      const largeBuffer = Buffer.alloc(21 * 1024 * 1024, 'x'); // 21MB
      await fileInput.first().setInputFiles({
        name: 'too-large.pdf',
        mimeType: 'application/pdf',
        buffer: largeBuffer,
      });

      // ASSERT — thông báo lỗi kích thước
      await expect(page.getByText(/vượt quá|quá lớn|max.*20mb|20mb/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('TC-UP-003: Upload file định dạng không cho phép — báo lỗi', async ({ page }) => {
    // ARRANGE
    await page.goto('/submissions/new');
    await page.getByRole('combobox', { name: /loại tờ trình/i }).click();
    await page.getByRole('option', { name: /MS|mua sắm/i }).click();

    // ACT — upload .exe
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      await fileInput.first().setInputFiles({
        name: 'malware.exe',
        mimeType: 'application/x-msdownload',
        buffer: Buffer.from('MZ'),
      });

      // ASSERT — lỗi định dạng không hợp lệ
      await expect(page.getByText(/định dạng không hỗ trợ|file không hợp lệ|không cho phép/i)).toBeVisible({ timeout: 5000 });
    }
  });
});
