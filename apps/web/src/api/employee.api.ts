import { apiClient } from '@/lib/axios';
import type { IPagination } from '@/api/org.api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IRole {
  id: string;
  name: string;
  displayName?: string | null;
  colorHex?: string | null;
  iconId?: string | null;
}

export interface IStaffRole {
  id: string;
  roleId: string;
  role: IRole;
}

export interface IEmployee {
  id: string;
  employeeId: string;
  firstName: string;
  middleName?: string | null;
  surname: string;
  mobileNumber?: string | null;
  dateOfBirth?: string | null;
  gender?: number | null;
  taxIdNumber?: string | null;
  englishSurname?: string | null;
  homePhoneAreaCode?: string | null;
  homePhoneNumber?: string | null;
  favoriteCake?: string | null;
  sssNumber?: string | null;
  philHealthIdNumber?: string | null;
  hdmfNumber?: string | null;
  nominatedBankName?: string | null;
  nominatedBankAccountName?: string | null;
  nominatedBankAccountNumber?: string | null;
  photoBusiness?: string | null;
  isManager?: boolean;
  shiftStartTime?: string | null;
  shiftEndTime?: string | null;
  latestStartTime?: string | null;
  latestEndShiftTime?: string | null;
  shiftEndDayOffset?: number | null;
  timezone?: string | null;
  isDeleted: boolean;
  isDisabled: boolean;
  companyId: string;
  departmentId?: string | null;
  officeId?: string | null;
  positionId?: string | null;
  teamId?: string | null;
  logCreatedAt: string;
  logUpdatedAt: string;
  userLogin?: {
    id: string;
    username: string;
    email: string;
    isActive: boolean;
    isDisabled: boolean;
    isFirstLogin?: boolean;
  } | null;
  department?: { id: string; name: string } | null;
  office?: { id: string; name: string } | null;
  position?: { id: string; name: string } | null;
  team?: { id: string; name: string } | null;
  company?: { id: string; name: string } | null;
  staffRoles: IStaffRole[];
}

export interface IEmployeeListResponse {
  data: IEmployee[];
  pagination: IPagination;
}

export interface IEmployeeFilter {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  officeId?: string;
  teamId?: string;
  roleId?: string;
  isActive?: string;
  /** '__none__' = no timezone set; any other value = exact timezone match */
  timezone?: string;
}

export interface ICreateEmployeeDto {
  email: string;
  firstName: string;
  surname: string;
  dateOfBirth: string;
  companyId: string;
  middleName?: string;
  employeeId?: string;
  departmentId?: string;
  officeId?: string;
  positionId?: string;
  teamId?: string;
  mobileNumber?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  latestStartTime?: string;
  latestEndShiftTime?: string;
  shiftEndDayOffset?: number;
  timezone?: string;
  roleIds?: string[];
}

export type IUpdateEmployeeDto = Partial<Omit<ICreateEmployeeDto, 'password'>> & {
  isDisabled?: boolean;
  isActive?: boolean;
  timezone?: string;
  taxIdNumber?: string;
  dateOfBirth?: string;
  gender?: number;
  englishSurname?: string;
  homePhoneAreaCode?: string;
  homePhoneNumber?: string;
  favoriteCake?: string;
  sssNumber?: string;
  philHealthIdNumber?: string;
  hdmfNumber?: string;
  nominatedBankName?: string;
  nominatedBankAccountName?: string;
  nominatedBankAccountNumber?: string;
};

export interface IImportPreviewRow {
  firstName: string;
  surname: string;
  username: string;
  email: string;
  companyId: string;
  password?: string;
  [key: string]: string | undefined;
}

export interface IImportPreviewResult {
  valid: IImportPreviewRow[];
  invalid: { row: IImportPreviewRow; errors: string[] }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function wrap<T>(promise: Promise<{ data: { success: boolean; data: T } }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function getEmployees(filter?: IEmployeeFilter): Promise<IEmployeeListResponse> {
  const res = await apiClient.get('/employees', { params: filter });
  return res.data.data ?? res.data;
}

export async function getEmployee(id: string): Promise<IEmployee> {
  return wrap(apiClient.get(`/employees/${id}`));
}

export async function createEmployee(dto: ICreateEmployeeDto): Promise<IEmployee> {
  return wrap(apiClient.post('/employees', dto));
}

export async function updateEmployee(id: string, dto: IUpdateEmployeeDto): Promise<IEmployee> {
  return wrap(apiClient.put(`/employees/${id}`, dto));
}

export async function deleteEmployee(id: string): Promise<IEmployee> {
  return wrap(apiClient.delete(`/employees/${id}`));
}

export async function resetEmployeePassword(
  id: string,
  dto: { newPassword?: string; isEmail?: boolean },
): Promise<{ temporaryPassword?: string }> {
  return wrap(apiClient.post(`/employees/${id}/reset-password`, dto));
}

export async function updateEmployeeRoles(
  id: string,
  roleIds: string[],
): Promise<IEmployee> {
  return wrap(apiClient.put(`/employees/${id}/roles`, { roleIds }));
}

export async function getEmployeeTimezones(): Promise<string[]> {
  const res = await apiClient.get('/employees/meta/timezones');
  return res.data.data ?? res.data;
}

export async function importEmployeePreview(file: File): Promise<IImportPreviewResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post('/employees/import/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data ?? res.data;
}

export async function importEmployeeConfirm(
  rows: IImportPreviewRow[],
): Promise<{ created: number }> {
  return wrap(apiClient.post('/employees/import/confirm', { rows }));
}

// ── Admin 2FA ─────────────────────────────────────────────────────────────────

export interface IEmployee2FAStatus {
  enabled: boolean;
  method: string | null;
  required: boolean;
  systemForced: boolean;
  backupCodesCount: number | null;
}

export async function getEmployee2FAStatus(id: string): Promise<IEmployee2FAStatus> {
  return wrap(apiClient.get(`/employees/${id}/2fa`));
}

export async function adminRevoke2FA(id: string): Promise<{ success: boolean }> {
  return wrap(apiClient.delete(`/employees/${id}/2fa`));
}

export async function adminSet2FARequired(
  id: string,
  required: boolean,
): Promise<{ success: boolean }> {
  return wrap(apiClient.put(`/employees/${id}/2fa/require`, { required }));
}

// ── Session Management ────────────────────────────────────────────────────────

export interface IEmployeeSessionStatus {
  isBlocked: boolean;
  blockedUntil: string | null;
}

export async function getEmployeeSessionStatus(id: string): Promise<IEmployeeSessionStatus> {
  return wrap(apiClient.get(`/employees/${id}/session-status`));
}

export async function clearSessionBlock(id: string): Promise<{ success: boolean }> {
  return wrap(apiClient.post(`/employees/${id}/session/clear`));
}
