import { apiClient } from '@/lib/axios';

type ApiWrap<T> = { success: boolean; data: T };

export type SubmissionType = 'MS' | 'NT';
export type StepType = 'REVIEW' | 'APPROVE';
export type StepMode = 'ANY' | 'ALL';

export interface IStaffRef {
  id: string;
  firstName: string;
  middleName?: string | null;
  surname: string;
}

export interface IApprovalRuleDetail {
  id: string;
  ruleId: string;
  stepOrder: number;
  stepType: StepType;
  stepLabel: string | null;
  minAmount: string | null;   // bigint as string
  maxAmount: string | null;
  approverId: string;
  mode: StepMode;
  /** NT only: null = fallback (all depts); non-null = specific dept routing. Always null for MS. */
  departmentId: string | null;
  approver: IStaffRef;
  department?: { id: string; name: string } | null;
}

export interface IApprovalRule {
  id: string;
  submissionType: SubmissionType;
  costCodeId: string | null;
  name: string | null;
  isActive: boolean;
  costCode?: { id: string; code: string; name: string; departmentId?: string } | null;
  details: IApprovalRuleDetail[];
}

export interface IApprovalRulesMatrix {
  staff: Array<{ id: string; name: string }>;
  rows: Array<{
    costCode: { id: string; code: string; name: string; departmentId: string };
    ruleId: string;
    cells: Record<string, Array<{
      stepLabel: string | null;
      minAmount: string | null;
      maxAmount: string | null;
      mode: StepMode;
    }>>;
  }>;
}

export interface IPreviewStep {
  stepOrder: number;
  stepType: StepType;
  stepLabel: string | null;
  mode: StepMode;
  approvers: Array<{ id: string; name: string }>;
  minAmount: string | null;
  maxAmount: string | null;
}

export interface IPreviewResult {
  steps: IPreviewStep[];
}

export interface ICreateRuleInput {
  submissionType: SubmissionType;
  costCodeId?: string;
  name?: string;
}

export interface IUpdateRuleInput {
  name?: string;
  isActive?: boolean;
}

export interface ICreateRuleDetailInput {
  stepOrder: number;
  stepType: StepType;
  stepLabel?: string;
  minAmount?: string | number | null;
  maxAmount?: string | number | null;
  approverId: string;
  mode?: StepMode;
  /** NT only: null = fallback; non-null UUID = specific dept. Must be omitted/null for MS. */
  departmentId?: string | null;
}

export type IUpdateRuleDetailInput = Partial<ICreateRuleDetailInput>;

export const approvalRulesApi = {
  list: (submissionType: SubmissionType, costCodeId?: string) =>
    apiClient
      .get<ApiWrap<IApprovalRule[]>>('/approval-rules', {
        params: { submissionType, ...(costCodeId ? { costCodeId } : {}) },
      })
      .then((r) => r.data.data),

  matrix: () =>
    apiClient
      .get<ApiWrap<IApprovalRulesMatrix>>('/approval-rules/matrix')
      .then((r) => r.data.data),

  getOne: (id: string) =>
    apiClient.get<ApiWrap<IApprovalRule>>(`/approval-rules/${id}`).then((r) => r.data.data),

  create: (data: ICreateRuleInput) =>
    apiClient.post<ApiWrap<IApprovalRule>>('/approval-rules', data).then((r) => r.data.data),

  update: (id: string, data: IUpdateRuleInput) =>
    apiClient.patch<ApiWrap<IApprovalRule>>(`/approval-rules/${id}`, data).then((r) => r.data.data),

  remove: (id: string) =>
    apiClient.delete<ApiWrap<{ message: string }>>(`/approval-rules/${id}`).then((r) => r.data.data),

  addDetail: (ruleId: string, data: ICreateRuleDetailInput) =>
    apiClient
      .post<ApiWrap<IApprovalRuleDetail>>(`/approval-rules/${ruleId}/details`, data)
      .then((r) => r.data.data),

  updateDetail: (id: string, data: IUpdateRuleDetailInput) =>
    apiClient
      .patch<ApiWrap<IApprovalRuleDetail>>(`/approval-rule-details/${id}`, data)
      .then((r) => r.data.data),

  removeDetail: (id: string) =>
    apiClient
      .delete<ApiWrap<{ message: string }>>(`/approval-rule-details/${id}`)
      .then((r) => r.data.data),

  preview: (data: { submissionType: SubmissionType; costCodeId?: string; total?: number; departmentId?: string }) =>
    apiClient.post<ApiWrap<IPreviewResult>>('/approval-rules/preview', data).then((r) => r.data.data),
};
