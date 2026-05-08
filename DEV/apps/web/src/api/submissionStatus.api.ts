import { apiClient } from '@/lib/axios';

export interface ISubmissionStatus {
  code: string;
  label: string;
  colorHex: string;
  orderNo: number;
  logUpdatedAt: string;
  logUpdatedBy: string | null;
}

type ApiWrap<T> = { success: boolean; data: T };

export const submissionStatusApi = {
  list: () =>
    apiClient.get<ApiWrap<ISubmissionStatus[]>>('/admin/submission-statuses').then((r) => r.data.data),

  create: (data: { code: string; label: string; colorHex: string; orderNo?: number }) =>
    apiClient.post<ApiWrap<ISubmissionStatus>>('/admin/submission-statuses', data).then((r) => r.data.data),

  update: (code: string, data: { label: string; colorHex: string }) =>
    apiClient.put<ApiWrap<ISubmissionStatus>>(`/admin/submission-statuses/${code}`, data).then((r) => r.data.data),

  remove: (code: string) =>
    apiClient.delete(`/admin/submission-statuses/${code}`),
};
