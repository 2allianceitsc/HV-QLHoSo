import { test, expect } from '@playwright/test';
import { AUTH_FILES } from '../_helpers/auth.helper';
import { createDraftMSSubmission, submitSubmission } from '../_helpers/data.helper';

test.describe('[SUB] Chi tiết tờ trình', () => {
  test.describe('Staff', () => {
    test.use({ storageState: AUTH_FILES.staff });

    test('TC-SUB-030: Xem chi tiết tờ trình draft', async ({ page, request }) => {
      // ARRANGE
      const sub = await createDraftMSSubmission(request);
      await page.goto(`/submissions/${sub.id}`);

      // ASSERT — thông tin hiển thị đúng
      await expect(page.getByText(/MS\d{4}/)).toBeVisible();
      await expect(page.getByText(/nháp/i)).toBeVisible();
      // Nút Gửi tờ trình hiển thị với draft
      await expect(page.getByRole('button', { name: /gửi tờ trình/i })).toBeVisible();
    });

    test('TC-SUB-031: Gửi tờ trình từ detail page', async ({ page, request }) => {
      // ARRANGE
      const sub = await createDraftMSSubmission(request);
      await page.goto(`/submissions/${sub.id}`);

      // ACT
      await page.getByRole('button', { name: /gửi tờ trình/i }).click();
      // Confirm dialog nếu có
      const confirmBtn = page.getByRole('button', { name: /xác nhận|gửi/i }).last();
      if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      // ASSERT — trạng thái thay đổi
      await expect(page.getByText(/chờ thẩm định|pending/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('button', { name: /gửi tờ trình/i })).not.toBeVisible();
    });

    test('TC-SUB-032: WorkflowTimeline hiển thị lịch sử', async ({ page, request }) => {
      // ARRANGE — tạo và submit để có log
      const sub = await createDraftMSSubmission(request);
      await submitSubmission(request, sub.id);
      await page.goto(`/submissions/${sub.id}`);

      // ASSERT — timeline/log hiển thị
      await expect(page.getByText(/đã gửi|submitted/i)).toBeVisible({ timeout: 3000 });
    });
  });
});
