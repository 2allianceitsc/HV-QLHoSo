import { apiClient } from '@/lib/axios';

export type HvRole = 'staff' | 'reviewer' | 'approver' | 'admin';

export interface IHvUser {
  id: string;
  employeeId: string;
  firstName: string;
  middleName?: string | null;
  surname: string;
  companyEmailAddress?: string | null;
  departmentId?: string | null;
  hvRoles: HvRole[];
  isDeleted: boolean;
  department?: { id: string; name: string } | null;
  userLogin?: { id: string; username: string; email: string; isFirstLogin: boolean; isActive: boolean } | null;
}

export interface IHvDepartment {
  id: string;
  name: string;
}

type ApiWrap<T> = { success: boolean; data: T };

export const hvAdminApi = {
  listUsers: (hvRole?: HvRole) =>
    apiClient.get<ApiWrap<IHvUser[]>>('/admin/users', { params: hvRole ? { hvRole } : undefined }).then((r) => r.data.data),

  createUser: (data: {
    username: string; email: string; firstName: string; middleName?: string;
    surname: string; departmentId: string; hvRoles: HvRole[];
  }) =>
    apiClient.post<ApiWrap<IHvUser>>('/admin/users', data).then((r) => r.data.data),

  updateUser: (id: string, data: Partial<{ email: string; firstName: string; middleName: string; surname: string; departmentId: string; hvRoles: HvRole[]; isActive: boolean }>) =>
    apiClient.put<ApiWrap<IHvUser>>(`/admin/users/${id}`, data).then((r) => r.data.data),

  deleteUser: (id: string) =>
    apiClient.delete<ApiWrap<{ message: string }>>(`/admin/users/${id}`).then((r) => r.data.data),

  resetPassword: (id: string) =>
    apiClient.post<ApiWrap<{ message: string }>>(`/admin/users/${id}/reset-password`).then((r) => r.data.data),

  listDepartments: () =>
    apiClient.get<ApiWrap<IHvDepartment[]>>('/admin/departments').then((r) => r.data.data),

  createDepartment: (name: string) =>
    apiClient.post<ApiWrap<IHvDepartment>>('/admin/departments', { name }).then((r) => r.data.data),

  updateDepartment: (id: string, name: string) =>
    apiClient.put<ApiWrap<IHvDepartment>>(`/admin/departments/${id}`, { name }).then((r) => r.data.data),

  deleteDepartment: (id: string) =>
    apiClient.delete<ApiWrap<{ message: string }>>(`/admin/departments/${id}`).then((r) => r.data.data),
};
