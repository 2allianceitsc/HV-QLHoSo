import { test, expect } from '@playwright/test';

test.describe('[AUTH] Quên mật khẩu', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('TC-AUTH-020: Gửi email reset — email tồn tại', async ({ page }) => {
    // ARRANGE
    await page.goto('/forgot-password');

    // ACT
    await page.getByLabel(/email/i).fill('hungnt@test.com');
    await page.getByRole('button', { name: /gửi|reset/i }).click();

    // ASSERT — luôn hiện thông báo thành công (không tiết lộ email có tồn tại không)
    await expect(page.getByText(/kiểm tra email|đã gửi|check your email/i)).toBeVisible();
  });

  test('TC-AUTH-021: Email không tồn tại — vẫn hiện thông báo thành công (user enumeration protection)', async ({ page }) => {
    // ARRANGE
    await page.goto('/forgot-password');

    // ACT
    await page.getByLabel(/email/i).fill('nonexistent@nowhere.com');
    await page.getByRole('button', { name: /gửi|reset/i }).click();

    // ASSERT — cùng thông báo như TC-AUTH-020
    await expect(page.getByText(/kiểm tra email|đã gửi|check your email/i)).toBeVisible();
  });

  test('TC-AUTH-023: Token reset hết hạn — báo lỗi', async ({ page }) => {
    // ARRANGE — dùng token giả đã hết hạn
    await page.goto('/reset-password?token=expired-fake-token-123');

    // ACT — thử submit
    const passwordFields = page.getByLabel(/mật khẩu mới/i);
    if (await passwordFields.count() > 0) {
      await passwordFields.first().fill('NewPass@123');
      await page.getByRole('button', { name: /đặt mật khẩu|reset/i }).click();
    }

    // ASSERT
    await expect(page.getByText(/hết hạn|không hợp lệ|invalid|expired/i)).toBeVisible();
  });
});
