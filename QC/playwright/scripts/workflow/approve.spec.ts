import { test, expect } from '@playwright/test';
import { AUTH_FILES } from '../_helpers/auth.helper';
import { createDraftMSSubmission, submitSubmission, reviewSubmission } from '../_helpers/data.helper';

test.describe('[WF] Phê duyệt (Approver)', () => {
  test.use({ storageState: AUTH_FILES.approver });

  test('TC-WF-020: Approver phê duyệt tờ trình in_review thành công', async ({ page, request }) => {
    // ARRANGE
    const sub = await createDraftMSSubmission(request);
    await submitSubmission(request, sub.id);
    await reviewSubmission(request, sub.id);
    await page.goto(`/submissions/${sub.id}`);

    // ACT
    await page.getByRole('button', { name: /phê duyệt/i }).click();
    const confirmBtn = page.getByRole('button', { name: /xác nhận|phê duyệt/i }).last();
    if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    // ASSERT — status chuyển sang approved
    await expect(page.getByText(/đã duyệt|approved/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/phê duyệt|đã phê duyệt/i)).toBeVisible();
  });

  test('TC-WF-021: Approver không thể phê duyệt tờ trình chưa qua thẩm định', async ({ page, request }) => {
    // ARRANGE — chỉ submit, chưa review
    const sub = await createDraftMSSubmission(request);
    await submitSubmission(request, sub.id);
    await page.goto(`/submissions/${sub.id}`);

    // ASSERT — nút Phê duyệt không hiển thị (chỉ pending_review, không phải in_review)
    await expect(page.getByRole('button', { name: /phê duyệt/i })).not.toBeVisible();
  });

  test('TC-WF-022: Không thể thao tác lên tờ trình đã approved', async ({ page, request }) => {
    // ARRANGE
    const sub = await createDraftMSSubmission(request);
    await submitSubmission(request, sub.id);
    await reviewSubmission(request, sub.id);
    await request.post(`/api/submissions/${sub.id}/approve`);
    await page.goto(`/submissions/${sub.id}`);

    // ASSERT — không còn nút action nào
    await expect(page.getByRole('button', { name: /phê duyệt/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /từ chối/i })).not.toBeVisible();
    await expect(page.getByText(/đã duyệt/i)).toBeVisible();
  });
});
