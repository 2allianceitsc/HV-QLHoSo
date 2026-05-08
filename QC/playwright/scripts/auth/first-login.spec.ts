import { test, expect } from '@playwright/test';

// Precondition: user 'thanhpv' phải có isFirstLogin = true trong test DB
const FIRST_LOGIN_USER = 'nhunght';
const FIRST_LOGIN_PASS = process.env.TEST_STAFF_PASSWORD!;
const NEW_PASS = 'NewPass@9999';

test.describe('[AUTH] Đổi mật khẩu lần đầu', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('TC-AUTH-010: isFirstLogin=true bắt buộc redirect đổi mật khẩu', async ({ page }) => {
    // ARRANGE
    await page.goto('/login');

    // ACT
    await page.getByLabel(/username/i).fill(FIRST_LOGIN_USER);
    await page.locator('input[type="password"]').fill(FIRST_LOGIN_PASS);
    await page.getByRole('button', { name: /sign in|đăng nhập/i }).click();

    // ASSERT — redirect sang change-password, không vào được /submissions
    await expect(page).toHaveURL(/\/(first-time-password|change-password)/);

    // Cố navigate sang /submissions
    await page.goto('/submissions');
    await expect(page).not.toHaveURL(/\/submissions$/);
  });

  test('TC-AUTH-012: Mật khẩu mới không đủ mạnh — validation lỗi', async ({ page }) => {
    // ARRANGE
    await page.goto('/login');
    await page.getByLabel(/username/i).fill(FIRST_LOGIN_USER);
    await page.locator('input[type="password"]').fill(FIRST_LOGIN_PASS);
    await page.getByRole('button', { name: /sign in|đăng nhập/i }).click();
    await page.waitForURL(/\/(first-time-password|change-password)/);

    // ACT — mật khẩu yếu
    await page.getByLabel(/mật khẩu mới/i).first().fill('12345678');
    await page.getByLabel(/xác nhận/i).fill('12345678');
    await page.getByRole('button', { name: /lưu|đặt mật khẩu|xác nhận/i }).click();

    // ASSERT
    await expect(page).toHaveURL(/\/(first-time-password|change-password)/);
    await expect(page.getByText(/mật khẩu phải có|password must|ít nhất/i)).toBeVisible();
  });

  test('TC-AUTH-013: Confirm password không khớp', async ({ page }) => {
    // ARRANGE
    await page.goto('/login');
    await page.getByLabel(/username/i).fill(FIRST_LOGIN_USER);
    await page.locator('input[type="password"]').fill(FIRST_LOGIN_PASS);
    await page.getByRole('button', { name: /sign in|đăng nhập/i }).click();
    await page.waitForURL(/\/(first-time-password|change-password)/);

    // ACT
    await page.getByLabel(/mật khẩu mới/i).first().fill(NEW_PASS);
    await page.getByLabel(/xác nhận/i).fill('DifferentPass@999');
    await page.getByRole('button', { name: /lưu|đặt mật khẩu|xác nhận/i }).click();

    // ASSERT
    await expect(page.getByText(/không khớp/i)).toBeVisible();
  });
});
