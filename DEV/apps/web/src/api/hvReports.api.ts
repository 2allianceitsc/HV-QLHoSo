import { apiClient } from '@/lib/axios';

export interface ISummaryReport {
  total: number;
  byStatus: Array<{ status: string; count: number }>;
  byDepartment: Array<{ departmentId: string; departmentName: string; count: number }>;
  byMonth: Array<{ month: string; count: number }>;
}

export interface IExpenseReport {
  items: Array<{
    id: string;
    costCodeId: string;
    costCodeName: string;
    amountExVat: number;
    amountIncVat: number;
    supplier: string;
    submission: { id: string; code: string; title: string; submittedDate: string; department: { id: string; name: string } };
    costCode: { id: string; code: string; name: string };
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: { totalExVat: number; totalIncVat: number };
}

export interface IContractReportItem {
  id: string;
  code: string;
  title: string;
  status: string;
  supplier: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  submittedDate: string;
  department: { id: string; name: string };
  attachments: Array<{ id: string; name: string; storageKey: string; publicUrl: string }>;
}

export interface IContractReport {
  summary: { total: number; expiringSoon: number; expired: number };
  data: IContractReportItem[];
  total: number;
  page: number;
  totalPages: number;
}

type ApiWrap<T> = { success: boolean; data: T };

export const hvReportsApi = {
  summary: (params?: { year?: number; month?: number }) =>
    apiClient.get<ApiWrap<ISummaryReport>>('/reports/summary', { params }).then((r) => r.data.data),

  expenses: (params?: {
    fromDate?: string; toDate?: string; department?: string;
    costCode?: string; supplier?: string; page?: number; limit?: number;
  }) =>
    apiClient.get<ApiWrap<IExpenseReport>>('/reports/expenses', { params }).then((r) => r.data.data),

  contracts: (params?: {
    q?: string;
    contractStatus?: string;
    contractEndDateFrom?: string;
    contractEndDateTo?: string;
    page?: number;
    limit?: number;
  }) =>
    apiClient.get<ApiWrap<IContractReport>>('/reports/contracts', { params }).then((r) => r.data.data),

  // Fetch all records (no pagination) for Excel export
  expensesAll: (params?: {
    fromDate?: string; toDate?: string; department?: string;
    costCode?: string; supplier?: string;
  }) =>
    apiClient.get<ApiWrap<IExpenseReport>>('/reports/expenses', { params: { ...params, limit: 99999, page: 1 } }).then((r) => r.data.data),
};
