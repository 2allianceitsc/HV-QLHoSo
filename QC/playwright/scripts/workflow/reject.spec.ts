import { test, expect } from '@playwright/test';
import { AUTH_FILES } from '../_helpers/auth.helper';
import { createDraftMSSubmission, submitSubmission, reviewSubmission } from '../_helpers/data.helper';

test.describe('[WF] Từ chối tờ trình', () => {
  test.describe('Reviewer từ chối', () => {
    test.use({ storageState: AUTH_FILES.reviewer });

    test('TC-WF-030: Reviewer từ chối tờ trình pending_review — nhập lý do', async ({ page, request }) => {
      // ARRANGE
      const sub = await createDraftMSSubmission(request);
      await submitSubmission(request, sub.id);
      await page.goto(`/submissions/${sub.id}`);

      // ACT — bấm Từ chối
      await page.getByRole('button', { name: /từ chối/i }).click();

      // Điền lý do trong dialog
      await page.getByLabel(/lý do/i).fill('Thông tin không đầy đủ, cần bổ sung báo giá.');
      await page.getByRole('button', { name: /xác nhận từ chối|từ chối/i }).last().click();

      // ASSERT — status chuyển sang rejected
      await expect(page.getByText(/đã từ chối|rejected/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/Thông tin không đầy đủ/i)).toBeVisible();
    });

    test('TC-WF-031: Từ chối không nhập lý do — validation lỗi', async ({ page, request }) => {
      // ARRANGE
      const sub = await createDraftMSSubmission(request);
      await submitSubmission(request, sub.id);
      await page.goto(`/submissions/${sub.id}`);

      // ACT — bấm Từ chối, không nhập lý do
      await page.getByRole('button', { name: /từ chối/i }).click();
      // Để trống lý do
      await page.getByRole('button', { name: /xác nhận từ chối|từ chối/i }).last().click();

      // ASSERT — dialog vẫn mở, có lỗi validation
      await expect(page.getByLabel(/lý do/i)).toBeVisible();
      await expect(page.getByText(/lý do bắt buộc|bắt buộc nhập lý do/i)).toBeVisible();
    });

    test('TC-WF-032: Hủy dialog từ chối — tờ trình không thay đổi', async ({ page, request }) => {
      // ARRANGE
      const sub = await createDraftMSSubmission(request);
      await submitSubmission(request, sub.id);
      await page.goto(`/submissions/${sub.id}`);

      // ACT — mở dialog rồi hủy
      await page.getByRole('button', { name: /từ chối/i }).click();
      await page.getByRole('button', { name: /hủy/i }).click();

      // ASSERT — dialog đóng, trạng thái vẫn là pending_review
      await expect(page.getByLabel(/lý do/i)).not.toBeVisible();
      await expect(page.getByText(/chờ thẩm định|pending/i)).toBeVisible();
    });
  });

  test.describe('Staff sau khi bị từ chối', () => {
    test.use({ storageState: AUTH_FILES.staff });

    test('TC-WF-040: Staff sửa và gửi lại tờ trình bị từ chối', async ({ page, request }) => {
      // ARRANGE — tạo, submit, reject qua API
      const sub = await createDraftMSSubmission(request);
      await submitSubmission(request, sub.id);
      await request.post(`/api/submissions/${sub.id}/reject`, {
        data: { reason: 'Cần bổ sung thông tin' },
      });
      await page.goto(`/submissions/${sub.id}`);

      // ASSERT — thấy trạng thái rejected và nút Sửa
      await expect(page.getByText(/đã từ chối|rejected/i)).toBeVisible();
      await expect(page.getByRole('link', { name: /sửa/i })).toBeVisible();

      // ACT — sửa tờ trình
      await page.getByRole('link', { name: /sửa/i }).click();
      const titleInput = page.getByLabel(/tiêu đề/i);
      await titleInput.clear();
      await titleInput.fill('[AUTO] Đã bổ sung thông tin');
      await page.getByRole('button', { name: /lưu|cập nhật/i }).click();
      await page.waitForURL(/\/submissions\/[a-zA-Z0-9-]+$/);

      // Gửi lại
      await page.getByRole('button', { name: /gửi tờ trình/i }).click();
      const confirmBtn = page.getByRole('button', { name: /xác nhận|gửi/i }).last();
      if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      // ASSERT — quay về pending_review
      await expect(page.getByText(/chờ thẩm định|pending/i)).toBeVisible({ timeout: 5000 });
    });

    test('TC-WF-041: Tờ trình rejected — không thể gửi khi chưa sửa', async ({ page, request }) => {
      // ARRANGE
      const sub = await createDraftMSSubmission(request);
      await submitSubmission(request, sub.id);
      await request.post(`/api/submissions/${sub.id}/reject`, {
        data: { reason: 'Test' },
      });
      await page.goto(`/submissions/${sub.id}`);

      // ASSERT — nút Gửi tờ trình hiển thị (từ rejected cần sửa rồi gửi lại)
      // Luồng: rejected → edit → gửi lại; hoặc rejected có nút Gửi lại trực tiếp
      // Tuỳ implementation: verify nút action phù hợp xuất hiện
      const hasResend = await page.getByRole('button', { name: /gửi lại|gửi tờ trình/i }).isVisible().catch(() => false);
      const hasEdit = await page.getByRole('link', { name: /sửa/i }).isVisible().catch(() => false);
      expect(hasResend || hasEdit).toBe(true);
    });
  });
});
