import { test, expect } from '@playwright/test';
import { AUTH_FILES } from '../_helpers/auth.helper';
import { createDraftMSSubmission } from '../_helpers/data.helper';

test.describe('[WF] Gửi tờ trình', () => {
  test.use({ storageState: AUTH_FILES.staff });

  test('TC-WF-001: Staff gửi tờ trình draft thành công', async ({ page, request }) => {
    // ARRANGE
    const sub = await createDraftMSSubmission(request);
    await page.goto(`/submissions/${sub.id}`);

    // ACT
    await page.getByRole('button', { name: /gửi tờ trình/i }).click();
    const confirmBtn = page.getByRole('button', { name: /xác nhận|gửi/i }).last();
    if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // ASSERT — status chuyển sang pending_review
    await expect(page.getByText(/chờ thẩm định|pending/i)).toBeVisible({ timeout: 5000 });
    // SubmissionLog ghi nhận sự kiện submit
    await expect(page.getByText(/đã gửi|submitted/i)).toBeVisible();
  });

  test('TC-WF-002: Không thể gửi tờ trình đang pending/in_review', async ({ page, request }) => {
    // ARRANGE — submit để chuyển sang pending_review
    const sub = await createDraftMSSubmission(request);
    await request.post(`/api/submissions/${sub.id}/submit`);
    await page.goto(`/submissions/${sub.id}`);

    // ASSERT — nút Gửi tờ trình không còn hiển thị
    await expect(page.getByRole('button', { name: /gửi tờ trình/i })).not.toBeVisible();
  });

  test('TC-WF-003: MS không có dòng chi phí — không thể gửi', async ({ page }) => {
    // ARRANGE — tạo tờ trình MS không có expense lines
    await page.goto('/submissions/new');
    await page.getByRole('combobox', { name: /loại tờ trình/i }).click();
    await page.getByRole('option', { name: /MS|mua sắm/i }).click();
    await page.getByRole('combobox', { name: /bộ phận/i }).click();
    await page.getByRole('option', { name: /IT/i }).click();
    await page.getByLabel(/tiêu đề/i).fill('[AUTO] MS không có chi phí');
    await page.getByLabel(/nội dung/i).fill('Nội dung test');

    // Lưu nháp (không thêm expense line)
    await page.getByRole('button', { name: /lưu nháp/i }).click();
    await page.waitForURL(/\/submissions\/[a-zA-Z0-9-]+$/);

    // ACT — thử gửi
    await page.getByRole('button', { name: /gửi tờ trình/i }).click();
    const confirmBtn = page.getByRole('button', { name: /xác nhận|gửi/i }).last();
    if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // ASSERT — lỗi về dòng chi phí
    await expect(page.getByText(/ít nhất một dòng chi phí|phải có chi phí/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/chờ thẩm định/i)).not.toBeVisible();
  });
});
