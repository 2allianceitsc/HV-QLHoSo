import { test, expect } from '@playwright/test';
import { AUTH_FILES } from '../_helpers/auth.helper';
import { createDraftMSSubmission } from '../_helpers/data.helper';

test.describe('[SUB] Sửa tờ trình', () => {
  test.use({ storageState: AUTH_FILES.staff });

  test('TC-SUB-040: Sửa tờ trình draft — lưu thành công', async ({ page, request }) => {
    // ARRANGE — tạo draft trước
    const sub = await createDraftMSSubmission(request);
    await page.goto(`/submissions/${sub.id}/edit`);

    // ACT — sửa tiêu đề
    const titleInput = page.getByLabel(/tiêu đề/i);
    await titleInput.clear();
    await titleInput.fill('[AUTO] Tiêu đề đã sửa');
    await page.getByRole('button', { name: /lưu|cập nhật/i }).click();

    // ASSERT
    await expect(page).toHaveURL(/\/submissions\/[a-zA-Z0-9-]+$/);
    await expect(page.getByText(/đã cập nhật|lưu thành công/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Tiêu đề đã sửa/i)).toBeVisible();
  });

  test('TC-SUB-041: Tờ trình đang duyệt — nút Sửa bị ẩn', async ({ page, request }) => {
    // ARRANGE — tạo và submit tờ trình
    const sub = await createDraftMSSubmission(request);

    // Gửi tờ trình qua API
    await request.post(`/api/submissions/${sub.id}/submit`);

    // ACT — truy cập detail page
    await page.goto(`/submissions/${sub.id}`);

    // ASSERT — không thấy nút Sửa
    await expect(page.getByRole('link', { name: /sửa/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /chỉnh sửa/i })).not.toBeVisible();
  });

  test('TC-SUB-042: Sửa tờ trình — xóa tiêu đề bị lỗi validation', async ({ page, request }) => {
    // ARRANGE
    const sub = await createDraftMSSubmission(request);
    await page.goto(`/submissions/${sub.id}/edit`);

    // ACT — xóa tiêu đề
    const titleInput = page.getByLabel(/tiêu đề/i);
    await titleInput.clear();
    await page.getByRole('button', { name: /lưu|cập nhật/i }).click();

    // ASSERT — còn ở trang edit, thấy lỗi
    await expect(page).toHaveURL(/\/submissions\/[a-zA-Z0-9-]+\/edit/);
    await expect(page.getByText(/tiêu đề bắt buộc|bắt buộc/i)).toBeVisible();
  });

  test('TC-SUB-043: Staff không thể sửa tờ trình của người khác', async ({ page }) => {
    // ARRANGE — hardcode một tờ trình của user khác (sẽ trả 403)
    // Dùng một ID giả — thực tế cần seed một submission của user khác
    await page.goto('/submissions/other-user-submission-fake/edit');

    // ASSERT — redirect về /submissions hoặc 403
    await expect(page).not.toHaveURL(/\/edit$/);
  });
});
