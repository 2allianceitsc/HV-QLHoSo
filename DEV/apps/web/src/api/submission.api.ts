import { apiClient } from '@/lib/axios';

export type SubmissionType = 'MS' | 'NT';
export type SubmissionStatus = 'draft' | 'pending_review' | 'in_review' | 'approved' | 'rejected';
export type HvRole = 'staff' | 'reviewer' | 'approver' | 'admin';

export interface IExpenseLine {
  id: string;
  submissionId: string;
  costCodeId: string;
  costCodeName: string;
  amountExVat: number;
  vatRate: number;
  amountIncVat: number;
  supplier: string;
  purchasedFor?: string | null;
  purpose?: string | null;
  usedBy?: string | null;
  sortOrder: number;
}

export interface IExistingInventory {
  id: string;
  submissionId: string;
  itemName: string;
  quantity: number;
  unit: string;
  sortOrder: number;
}

export interface IAttachment {
  id: string;
  submissionId: string;
  fileType: string;
  name: string;
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ISubmissionLog {
  id: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  note?: string | null;
  createdAt: string;
  user: { id: string; firstName: string; middleName?: string | null; surname: string };
}

export interface IStaffRef {
  id: string;
  firstName: string;
  middleName?: string | null;
  surname: string;
  companyEmailAddress?: string | null;
}

export interface ISubmission {
  id: string;
  type: SubmissionType;
  code: string;
  status: SubmissionStatus;
  title: string;
  content: string;
  submittedDate: string;
  supplier?: string | null;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  approvedAt?: string | null;
  logCreatedAt: string;
  submitter: IStaffRef;
  reviewer: IStaffRef;
  approver: IStaffRef;
  department: { id: string; name: string };
  expenseLines?: IExpenseLine[];
  existingInventory?: IExistingInventory[];
  attachments?: IAttachment[];
  logs?: ISubmissionLog[];
}

export interface ISubmissionListResponse {
  items: ISubmission[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ISubmissionStats {
  total: number;
  pending_review: number;
  in_review: number;
  approved: number;
}

export interface IStatusCatalogItem {
  code: string;
  label: string;
  colorHex: string;
  orderNo: number;
}

export interface IExpenseLineInput {
  costCodeId: string;
  costCodeName: string;
  amountExVat: number;
  vatRate?: number;
  supplier?: string;
  purchasedFor?: string;
  purpose?: string;
  usedBy?: string;
  sortOrder?: number;
}

export interface IExistingInventoryInput {
  itemName: string;
  quantity: number;
  unit: string;
  sortOrder?: number;
}

export interface ICreateSubmissionInput {
  type: SubmissionType;
  action: 'submit' | 'draft';
  departmentId: string;
  submittedDate: string;
  title: string;
  content: string;
  expenseLines?: IExpenseLineInput[];
  existingInventory?: IExistingInventoryInput[];
  contractStartDate?: string;
  contractEndDate?: string;
  supplier?: string;
}

export interface IListSubmissionsParams {
  type?: SubmissionType;
  q?: string;
  department?: string;
  status?: SubmissionStatus;
  supplier?: string;
  reviewerId?: string;
  approverId?: string;
  submittedDateFrom?: string;
  submittedDateTo?: string;
  page?: number;
  limit?: number;
}

type ApiWrap<T> = { success: boolean; data: T };

export const submissionApi = {
  list: (params?: IListSubmissionsParams) =>
    apiClient.get<ApiWrap<ISubmissionListResponse>>('/submissions', { params }).then((r) => r.data.data),

  get: (id: string) =>
    apiClient.get<ApiWrap<ISubmission>>(`/submissions/${id}`).then((r) => r.data.data),

  create: (data: ICreateSubmissionInput) =>
    apiClient.post<ApiWrap<ISubmission>>('/submissions', data).then((r) => r.data.data),

  update: (id: string, data: Partial<ICreateSubmissionInput>) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { type: _type, action: _action, ...body } = data;
    return apiClient.put<ApiWrap<ISubmission>>(`/submissions/${id}`, body).then((r) => r.data.data);
  },

  remove: (id: string) =>
    apiClient.delete<ApiWrap<{ message: string }>>(`/submissions/${id}`).then((r) => r.data.data),

  submit: (id: string) =>
    apiClient.post<ApiWrap<ISubmission>>(`/submissions/${id}/submit`).then((r) => r.data.data),

  review: (id: string) =>
    apiClient.post<ApiWrap<ISubmission>>(`/submissions/${id}/review`).then((r) => r.data.data),

  approve: (id: string) =>
    apiClient.post<ApiWrap<ISubmission>>(`/submissions/${id}/approve`).then((r) => r.data.data),

  reject: (id: string, reason: string) =>
    apiClient.post<ApiWrap<ISubmission>>(`/submissions/${id}/reject`, { reason }).then((r) => r.data.data),

  stats: () =>
    apiClient.get<ApiWrap<ISubmissionStats>>('/submissions/stats').then((r) => r.data.data),

  statusCatalog: () =>
    apiClient.get<ApiWrap<IStatusCatalogItem[]>>('/submissions/status-catalog').then((r) => r.data.data),

  listDepartments: () =>
    apiClient.get<ApiWrap<{ id: string; name: string }[]>>('/submissions/departments').then((r) => r.data.data),

  listFilterStaff: (hvRole: 'reviewer' | 'approver') =>
    apiClient.get<ApiWrap<{ id: string; firstName: string; middleName?: string | null; surname: string }[]>>('/submissions/filter-staff', { params: { hvRole } }).then((r) => r.data.data),

  getUploadUrl: (data: { mimeType: string; ext: string }) =>
    apiClient.post<ApiWrap<{ uploadUrl: string; publicUrl: string }>>('/submissions/upload-url', data).then((r) => r.data.data),

  saveAttachment: (submissionId: string, data: { name: string; url: string; fileType: string; mimeType: string; sizeBytes: number }) =>
    apiClient.post<ApiWrap<IAttachment>>(`/submissions/${submissionId}/attachments`, data).then((r) => r.data.data),
};
