import { test, expect } from '@playwright/test';
import { login } from '../_helpers/auth.helper';

const STAFF_USER = 'hungnt';
const STAFF_PASS = process.env.TEST_STAFF_PASSWORD!;

test.describe('[AUTH] Đăng nhập', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // không dùng saved session

  test('TC-AUTH-001: Đăng nhập thành công với staff', async ({ page }) => {
    // ARRANGE
    await page.goto('/login');

    // ACT
    await page.getByLabel(/username/i).fill(STAFF_USER);
    await page.locator('input[type="password"]').fill(STAFF_PASS);
    await page.getByRole('button', { name: /sign in|đăng nhập/i }).click();

    // ASSERT
    await page.waitForURL('**/submissions');
    await expect(page).toHaveURL(/\/submissions/);
    // Sidebar không chứa menu Báo cáo / Admin
    await expect(page.getByRole('link', { name: /báo cáo/i })).not.toBeVisible();
    await expect(page.getByRole('link', { name: /quản lý người dùng/i })).not.toBeVisible();
  });

  test('TC-AUTH-002: Sai thông tin đăng nhập', async ({ page }) => {
    // ARRANGE
    await page.goto('/login');

    // ACT
    await page.getByLabel(/username/i).fill(STAFF_USER);
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in|đăng nhập/i }).click();

    // ASSERT
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/thông tin đăng nhập không đúng/i)).toBeVisible();
  });

  test('TC-AUTH-004: Bỏ trống username — validation inline', async ({ page }) => {
    // ARRANGE
    await page.goto('/login');

    // ACT — chỉ điền password, để trống username
    await page.locator('input[type="password"]').fill(STAFF_PASS);
    await page.getByRole('button', { name: /sign in|đăng nhập/i }).click();

    // ASSERT — vẫn ở login, không gọi API
    await expect(page).toHaveURL(/\/login/);
    // HTML5 validation hoặc inline error
    const usernameInput = page.getByLabel(/username/i);
    await expect(usernameInput).toBeFocused();
  });

  test('TC-AUTH-005: Redirect về login khi chưa xác thực', async ({ page }) => {
    // ARRANGE — truy cập trực tiếp trang cần auth
    await page.goto('/submissions');

    // ASSERT — bị redirect về login
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC-AUTH-030: Đăng xuất thành công', async ({ page }) => {
    // ARRANGE — login trước
    await login(page, STAFF_USER, STAFF_PASS);
    await page.waitForURL('**/submissions');

    // ACT
    await page.getByRole('button', { name: /đăng xuất/i }).click();

    // ASSERT
    await expect(page).toHaveURL(/\/login/);

    // Truy cập lại /submissions → phải redirect về login
    await page.goto('/submissions');
    await expect(page).toHaveURL(/\/login/);
  });
});
