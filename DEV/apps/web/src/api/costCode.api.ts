import { apiClient } from '@/lib/axios';

export interface ICostCode {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  isActive: boolean;
  isDeleted: boolean;
  department?: { id: string; name: string };
}

type ApiWrap<T> = { success: boolean; data: T };

export const costCodeApi = {
  list: (departmentId?: string) =>
    apiClient.get<ApiWrap<ICostCode[]>>('/cost-codes', { params: departmentId ? { departmentId } : undefined }).then((r) => r.data.data),

  create: (data: { code: string; name: string; departmentId: string }) =>
    apiClient.post<ApiWrap<ICostCode>>('/cost-codes', data).then((r) => r.data.data),

  update: (id: string, data: { code?: string; name?: string; departmentId?: string; isActive?: boolean }) =>
    apiClient.put<ApiWrap<ICostCode>>(`/cost-codes/${id}`, data).then((r) => r.data.data),

  remove: (id: string) =>
    apiClient.delete<ApiWrap<{ message: string }>>(`/cost-codes/${id}`).then((r) => r.data.data),
};
