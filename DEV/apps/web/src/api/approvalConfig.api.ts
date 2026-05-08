import { apiClient } from '@/lib/axios';

export interface IApprovalConfig {
  id: string;
  departmentId: string;
  reviewerId: string;
  approverId: string;
  department: { id: string; name: string };
  reviewer: { id: string; firstName: string; middleName?: string | null; surname: string };
  approver: { id: string; firstName: string; middleName?: string | null; surname: string };
}

export interface IStaffOption {
  id: string;
  firstName: string;
  middleName?: string | null;
  surname: string;
  departmentId?: string | null;
}

type ApiWrap<T> = { success: boolean; data: T };

export const approvalConfigApi = {
  list: () =>
    apiClient.get<ApiWrap<IApprovalConfig[]>>('/approval-config').then((r) => r.data.data),

  upsert: (departmentId: string, data: { reviewerId: string; approverId: string }) =>
    apiClient.put<ApiWrap<IApprovalConfig>>(`/approval-config/${departmentId}`, data).then((r) => r.data.data),

  listReviewers: () =>
    apiClient.get<ApiWrap<IStaffOption[]>>('/approval-config/reviewers').then((r) => r.data.data),

  listApprovers: () =>
    apiClient.get<ApiWrap<IStaffOption[]>>('/approval-config/approvers').then((r) => r.data.data),
};
