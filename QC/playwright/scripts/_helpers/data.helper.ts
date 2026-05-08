import type { APIRequestContext } from '@playwright/test';

/**
 * Tạo tờ trình mua sắm (MS) qua API và trả về ID.
 * Dùng để seed dữ liệu cho các test workflow.
 */
export async function createDraftMSSubmission(
  request: APIRequestContext,
  options: { title?: string; content?: string } = {},
): Promise<string> {
  const res = await request.post('/api/submissions', {
    data: {
      type: 'MS',
      departmentId: process.env.TEST_IT_DEPT_ID,
      submittedDate: new Date().toISOString().slice(0, 10),
      title: options.title ?? `[TEST] Tờ trình MS ${Date.now()}`,
      content: options.content ?? 'Nội dung kiểm thử tự động.',
      expenseLines: [{
        costCodeId: process.env.TEST_COST_CODE_ID,
        costCodeName: 'IT0001 — Phần mềm',
        amountExVat: 1000000,
        amountIncVat: 1100000,
        supplier: 'Nhà cung cấp test',
      }],
    },
  });
  const body = await res.json();
  return body.id as string;
}

/**
 * Chuyển tờ trình sang pending_review bằng staff token.
 */
export async function submitSubmission(request: APIRequestContext, id: string) {
  await request.post(`/api/submissions/${id}/submit`);
}

/**
 * Chuyển tờ trình sang in_review bằng reviewer token.
 */
export async function reviewSubmission(request: APIRequestContext, id: string) {
  await request.post(`/api/submissions/${id}/review`);
}
