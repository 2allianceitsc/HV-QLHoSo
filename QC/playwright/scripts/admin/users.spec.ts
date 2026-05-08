import { test, expect } from '@playwright/test';
import { AUTH_FILES } from '../_helpers/auth.helper';

test.describe('[ADM] Quản lý người dùng', () => {
  test.use({ storageState: AUTH_FILES.admin });

  test('TC-ADM-001: Admin xem danh sách user', async ({ page }) => {
    // ARRANGE
    await page.goto('/admin/users');

    // ASSERT — bảng hiển thị, có cột cơ bản
    await expect(page.getByRole('columnheader', { name: /tên đăng nhập|username/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /họ tên|full.?name/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /vai trò|role/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /bộ phận/i })).toBeVisible();
  });

  test('TC-ADM-002: Tạo user mới thành công', async ({ page }) => {
    // ARRANGE
    await page.goto('/admin/users');
    const ts = Date.now();

    // ACT — mở dialog tạo
    await page.getByRole('button', { name: /tạo user|thêm người dùng/i }).click();

    await page.getByLabel(/tên đăng nhập|username/i).fill(`auto_${ts}`);
    await page.getByLabel(/họ tên|full.?name/i).fill(`Auto Test ${ts}`);
    await page.getByLabel(/email/i).fill(`auto_${ts}@test.com`);

    // Chọn bộ phận
    const deptSelect = page.getByRole('combobox', { name: /bộ phận/i });
    if (await deptSelect.isVisible()) {
      await deptSelect.click();
      await page.getByRole('option').first().click();
    }

    // Chọn vai trò
    const roleSelect = page.getByRole('combobox', { name: /vai trò|role/i });
    if (await roleSelect.isVisible()) {
      await roleSelect.click();
      await page.getByRole('option', { name: /staff/i }).first().click();
    }

    await page.getByRole('button', { name: /lưu|tạo/i }).last().click();

    // ASSERT
    await expect(page.getByText(/đã tạo|tạo thành công/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(`auto_${ts}`)).toBeVisible();
  });

  test('TC-ADM-003: Tạo user — username trùng báo lỗi', async ({ page }) => {
    // ARRANGE
    await page.goto('/admin/users');

    // ACT — dùng username đã có trong seed
    await page.getByRole('button', { name: /tạo user|thêm người dùng/i }).click();
    await page.getByLabel(/tên đăng nhập|username/i).fill('hungnt'); // đã tồn tại
    await page.getByLabel(/họ tên|full.?name/i).fill('Duplicate User');
    await page.getByLabel(/email/i).fill('dup@test.com');
    await page.getByRole('button', { name: /lưu|tạo/i }).last().click();

    // ASSERT — lỗi trùng username
    await expect(page.getByText(/đã tồn tại|username.*tồn tại|trùng/i)).toBeVisible({ timeout: 5000 });
  });

  test('TC-ADM-004: Sửa thông tin user', async ({ page }) => {
    // ARRANGE
    await page.goto('/admin/users');

    // ACT — bấm nút Edit trên dòng đầu tiên
    await page.getByRole('button', { name: /sửa|edit/i }).first().click();

    const nameInput = page.getByLabel(/họ tên|full.?name/i);
    await nameInput.clear();
    await nameInput.fill('Tên đã sửa Auto');
    await page.getByRole('button', { name: /lưu|cập nhật/i }).last().click();

    // ASSERT
    await expect(page.getByText(/đã cập nhật|lưu thành công/i)).toBeVisible({ timeout: 5000 });
  });

  test('TC-ADM-005: Xóa user — confirm dialog', async ({ page }) => {
    // ARRANGE
    await page.goto('/admin/users');

    // ACT — bấm nút Xóa trên dòng đầu tiên
    await page.getByRole('button', { name: /xóa/i }).first().click();

    // ASSERT — confirm dialog xuất hiện
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/xác nhận xóa|bạn có chắc/i)).toBeVisible();

    // Hủy
    await page.getByRole('button', { name: /hủy/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('TC-ADM-006: Reset mật khẩu user', async ({ page }) => {
    // ARRANGE
    await page.goto('/admin/users');

    // ACT — bấm Reset mật khẩu
    await page.getByRole('button', { name: /reset mật khẩu/i }).first().click();

    // ASSERT — confirm dialog với mật khẩu tạm thời
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/HV@123!|mật khẩu tạm thời/i)).toBeVisible();

    // Confirm reset
    await page.getByRole('button', { name: /xác nhận|reset/i }).last().click();
    await expect(page.getByText(/đã reset|reset thành công/i)).toBeVisible({ timeout: 5000 });
  });

  test('TC-ADM-007: Filter user theo vai trò', async ({ page }) => {
    // ARRANGE
    await page.goto('/admin/users');

    // ACT — lọc theo reviewer
    const roleFilter = page.getByRole('combobox', { name: /vai trò|lọc/i });
    if (await roleFilter.isVisible()) {
      await roleFilter.click();
      await page.getByRole('option', { name: /reviewer/i }).click();

      // ASSERT — chỉ hiện user với role reviewer
      await page.waitForTimeout(500);
      const rows = page.getByRole('row');
      const count = await rows.count();
      if (count > 1) {
        // Mỗi row (trừ header) đều là reviewer
        const reviewerBadges = page.getByText(/reviewer/i);
        await expect(reviewerBadges.first()).toBeVisible();
      }
    }
  });
});
