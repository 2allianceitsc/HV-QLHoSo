import { apiClient } from '@/lib/axios';
import { safeArray } from '@/lib/safeArray';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ISystemRole {
  id: string;
  name: string;
  displayName?: string | null;
  description?: string | null;
  colorHex?: string | null;
  iconId?: string | null;
  staffCount: number;
  isDeleted: boolean;
  isDisabled: boolean;
  orderNo: number;
  logCreatedAt: string;
  logUpdatedAt: string;
}

export interface ICreateRoleDto {
  name: string;
  displayName?: string;
  description?: string;
  colorHex?: string;
  iconId?: string;
}

export interface IUpdateRoleDto extends Partial<ICreateRoleDto> {}

export interface ISystemSetting {
  key: string;
  value: string;
  description?: string | null;
  category?: string | null;
  logUpdatedAt: string;
  logUpdatedBy?: string | null;
}

export interface IStatusDefinition {
  id: string;
  name: string;
  displayName?: string | null;
  description?: string | null;
  colorHex?: string | null;
  iconId?: string | null;
  companyId?: string | null;
  officeId?: string | null;
  clientId?: string | null;
  teamId?: string | null;
  scopeType?: string | null;
  isLoginStatus: boolean;
  isLogoutStatus: boolean;
  isWorkingInStatus: boolean;
  isWorkingOutStatus: boolean;
  isBreak: boolean;
  isAbsent: boolean;
  isIdleStatus: boolean;
  isNormalDayOff: boolean;
  isHalfDayOff: boolean;
  isPaid: boolean;
  maxDurationSeconds?: number | null;
  orderNo: number;
  isDeleted: boolean;
  isDisabled: boolean;
  logCreatedAt: string;
  logUpdatedAt: string;
}

export interface ICreateStatusDto {
  name: string;
  description?: string | null;
  colorHex?: string;
  iconId?: string;
  companyId?: string;
  officeId?: string;
  clientId?: string;
  teamId?: string;
  scopeType?: 'Client' | 'System';
  isLoginStatus?: boolean;
  isLogoutStatus?: boolean;
  isWorkingInStatus?: boolean;
  isWorkingOutStatus?: boolean;
  isBreak?: boolean;
  isAbsent?: boolean;
  isIdleStatus?: boolean;
  isNormalDayOff?: boolean;
  isHalfDayOff?: boolean;
  isPaid?: boolean;
  maxDurationSeconds?: number;
  orderNo?: number;
}

export interface IUpdateStatusDto extends Partial<ICreateStatusDto> {
  isDisabled?: boolean;
}

export interface IAuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  actorId?: string | null;
  actorName?: string | null;
  changes?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface IAuditLogFilter {
  entity?: string;
  actorId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface IVibeIconSet {
  id: string;
  setName: string;
  description?: string | null;
  isActive: boolean;
  isDeleted: boolean;
  isDisabled: boolean;
  orderNo: number;
  logCreatedAt: string;
  logUpdatedAt: string;
  _count?: { icons: number };
}

export interface ICreateVibeIconSetDto {
  setName: string;
  description?: string;
}

export interface IUpdateVibeIconSetDto extends ICreateVibeIconSetDto {}

export interface IVibeIcon {
  id: string;
  vibeIconSetId?: string | null;
  name: string;
  hoverText?: string | null;
  iconText?: string | null;
  emojiCode?: string | null;
  iconUrl?: string | null;
  description?: string | null;
  category?: string | null;
  isDeleted: boolean;
  isDisabled: boolean;
  orderNo: number;
  logCreatedAt: string;
  logUpdatedAt: string;
  vibeIconSet?: Pick<IVibeIconSet, 'id' | 'setName' | 'isActive'> | null;
}

export interface ICreateVibeIconDto {
  vibeIconSetId?: string;
  name: string;
  hoverText?: string;
  iconText?: string;
  emojiCode?: string;
  iconUrl?: string;
  description?: string;
  category?: string;
  orderNo?: number;
}

export interface IUpdateVibeIconDto extends Partial<ICreateVibeIconDto> {}

export interface IVibeIconUrlIssue {
  id: string;
  name: string;
  iconUrl: string;
  vibeIconSetId: string | null;
  vibeIconSetName: string | null;
  httpStatus?: number;
  error?: string;
}

export interface IVibeIconUrlScanResult {
  scannedAt: string;
  totalChecked: number;
  brokenCount: number;
  broken: IVibeIconUrlIssue[];
}

export interface IEmployeePhotoUrlIssue {
  staffId: string;
  fullName: string;
  photoUrl: string;
  httpStatus?: number;
  error?: string;
}

export interface IEmployeePhotoUrlScanResult {
  scannedAt: string;
  totalChecked: number;
  brokenCount: number;
  broken: IEmployeePhotoUrlIssue[];
}

// ── Roles ─────────────────────────────────────────────────────────────────────

export async function getRoles(): Promise<ISystemRole[]> {
  const res = await apiClient.get<{ success: boolean; data: ISystemRole[] }>('/system/roles');
  return safeArray(res.data.data);
}

export async function getRole(id: string): Promise<ISystemRole> {
  const res = await apiClient.get<{ success: boolean; data: ISystemRole }>(`/system/roles/${id}`);
  return res.data.data;
}

export async function createRole(dto: ICreateRoleDto): Promise<ISystemRole> {
  const res = await apiClient.post<{ success: boolean; data: ISystemRole }>('/system/roles', dto);
  return res.data.data;
}

export async function updateRole(id: string, dto: IUpdateRoleDto): Promise<ISystemRole> {
  const res = await apiClient.put<{ success: boolean; data: ISystemRole }>(`/system/roles/${id}`, dto);
  return res.data.data;
}

export async function deleteRole(id: string): Promise<void> {
  await apiClient.delete(`/system/roles/${id}`);
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<Record<string, ISystemSetting[]>> {
  const res = await apiClient.get<{ success: boolean; data: Record<string, ISystemSetting[]> }>('/system/settings');
  return res.data.data;
}

export async function getSetting(key: string): Promise<ISystemSetting> {
  const res = await apiClient.get<{ success: boolean; data: ISystemSetting }>(`/system/settings/${key}`);
  return res.data.data;
}

export async function bulkUpdateSettings(settings: Record<string, string>): Promise<{ updated: number }> {
  const res = await apiClient.put<{ success: boolean; data: { updated: number } }>('/system/settings', { settings });
  return res.data.data;
}

export async function updateSetting(key: string, value: string): Promise<ISystemSetting> {
  const res = await apiClient.put<{ success: boolean; data: ISystemSetting }>(`/system/settings/${key}`, { value });
  return res.data.data;
}

// ── Statuses ──────────────────────────────────────────────────────────────────

export interface IStatusFilter {
  scope?: 'system' | 'company' | 'office' | 'client' | 'team';
  scopeId?: string;
}

export async function getSystemStatuses(filter?: IStatusFilter): Promise<IStatusDefinition[]> {
  const res = await apiClient.get<{ success: boolean; data: IStatusDefinition[] }>('/system/statuses', { params: filter });
  return safeArray(res.data.data);
}

export async function getSystemStatus(id: string): Promise<IStatusDefinition> {
  const res = await apiClient.get<{ success: boolean; data: IStatusDefinition }>(`/system/statuses/${id}`);
  return res.data.data;
}

export async function createSystemStatus(dto: ICreateStatusDto): Promise<IStatusDefinition> {
  const res = await apiClient.post<{ success: boolean; data: IStatusDefinition }>('/system/statuses', dto);
  return res.data.data;
}

export async function updateSystemStatus(id: string, dto: IUpdateStatusDto): Promise<IStatusDefinition> {
  const res = await apiClient.put<{ success: boolean; data: IStatusDefinition }>(`/system/statuses/${id}`, dto);
  return res.data.data;
}

export async function deleteSystemStatus(id: string): Promise<void> {
  await apiClient.delete(`/system/statuses/${id}`);
}

// ── Audit Logs ────────────────────────────────────────────────────────────────

export interface IAuditLogsResponse {
  data: IAuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getAuditLogs(filter?: IAuditLogFilter): Promise<IAuditLogsResponse> {
  const res = await apiClient.get<{ success: boolean; data: IAuditLogsResponse }>('/system/audit-logs', { params: filter });
  return res.data.data;
}

// ── API Request Logs ──────────────────────────────────────────────────────────

export interface IApiRequestLog {
  id: string;
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  userId?: string | null;
  userName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestBody?: string | null;
  queryParams?: string | null;
  clientInfo?: string | null;
  createdAt: string;
}

export interface IApiLogFilter {
  method?: string;
  url?: string;
  statusCode?: number;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface IApiLogsResponse {
  data: IApiRequestLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getApiLogs(filter?: IApiLogFilter): Promise<IApiLogsResponse> {
  const res = await apiClient.get<{ success: boolean; data: IApiLogsResponse }>('/system/api-logs', { params: filter });
  return res.data.data;
}

// ── Login OTP (2FA) ──────────────────────────────────────────────────────────

export interface ILoginOtp {
  id: string;
  userId: string;
  otp: string;
  expiresAt: string;
  isUsed: boolean;
  createdAt: string;
  actionType: 'LOGIN_2FA' | 'SETUP_2FA' | 'FORGOT_PASSWORD';
  userLogin?: { username: string; email: string };
}

export interface ILoginOtpFilter {
  email?: string;
  isUsed?: string;
  page?: number;
  limit?: number;
}

export interface ILoginOtpResponse {
  data: ILoginOtp[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function getLoginOtps(filter?: ILoginOtpFilter): Promise<ILoginOtpResponse> {
  const res = await apiClient.get<{ success: boolean } & ILoginOtpResponse>('/system/login-otps', { params: filter });
  return { data: safeArray(res.data.data), pagination: res.data.pagination };
}

// ── VIBE Icon Sets ────────────────────────────────────────────────────────────

export async function getVibeIconSets(): Promise<IVibeIconSet[]> {
  const res = await apiClient.get<{ success: boolean; data: IVibeIconSet[] }>('/system/vibe-icons/sets');
  return safeArray(res.data.data);
}

export async function createVibeIconSet(dto: ICreateVibeIconSetDto): Promise<IVibeIconSet> {
  const res = await apiClient.post<{ success: boolean; data: IVibeIconSet }>('/system/vibe-icons/sets', dto);
  return res.data.data;
}

export async function updateVibeIconSet(id: string, dto: IUpdateVibeIconSetDto): Promise<IVibeIconSet> {
  const res = await apiClient.put<{ success: boolean; data: IVibeIconSet }>(`/system/vibe-icons/sets/${id}`, dto);
  return res.data.data;
}

export async function deleteVibeIconSet(id: string): Promise<void> {
  await apiClient.delete(`/system/vibe-icons/sets/${id}`);
}

export async function activateVibeIconSet(id: string): Promise<IVibeIconSet> {
  const res = await apiClient.put<{ success: boolean; data: IVibeIconSet }>(`/system/vibe-icons/sets/${id}/activate`);
  return res.data.data;
}

export async function getVibeIconsBySet(setId: string): Promise<IVibeIcon[]> {
  const res = await apiClient.get<{ success: boolean; data: IVibeIcon[] }>(`/system/vibe-icons/sets/${setId}/icons`);
  return safeArray(res.data.data);
}

// ── VIBE Icons ────────────────────────────────────────────────────────────────

export async function getSystemVibeIcons(): Promise<IVibeIcon[]> {
  const res = await apiClient.get<{ success: boolean; data: IVibeIcon[] }>('/system/vibe-icons');
  return safeArray(res.data.data);
}

export async function createVibeIcon(dto: ICreateVibeIconDto): Promise<IVibeIcon> {
  const res = await apiClient.post<{ success: boolean; data: IVibeIcon }>('/system/vibe-icons', dto);
  return res.data.data;
}

export async function updateVibeIcon(id: string, dto: IUpdateVibeIconDto): Promise<IVibeIcon> {
  const res = await apiClient.put<{ success: boolean; data: IVibeIcon }>(`/system/vibe-icons/${id}`, dto);
  return res.data.data;
}

export async function deleteVibeIcon(id: string): Promise<void> {
  await apiClient.delete(`/system/vibe-icons/${id}`);
}

export async function toggleVibeIcon(id: string): Promise<IVibeIcon> {
  const res = await apiClient.put<{ success: boolean; data: IVibeIcon }>(`/system/vibe-icons/${id}/toggle`);
  return res.data.data;
}

export async function reorderVibeIcons(ids: string[]): Promise<{ reordered: number }> {
  const res = await apiClient.put<{ success: boolean; data: { reordered: number } }>('/system/vibe-icons/reorder', { ids });
  return res.data.data;
}

export async function copyIconsToSet(targetSetId: string, sourceSetId: string): Promise<{ copied: number }> {
  const res = await apiClient.post<{ success: boolean; data: { copied: number } }>(
    `/system/vibe-icons/sets/${targetSetId}/copy-icons`,
    { sourceSetId },
  );
  return res.data.data;
}

export async function duplicateVibeIconSet(id: string): Promise<IVibeIconSet> {
  const res = await apiClient.post<{ success: boolean; data: IVibeIconSet }>(
    `/system/vibe-icons/sets/${id}/duplicate`,
  );
  return res.data.data;
}

export async function collectOrphanedIcons(): Promise<{ collected: number; setId: string | null }> {
  const res = await apiClient.post<{ success: boolean; data: { collected: number; setId: string | null } }>(
    '/system/vibe-icons/sets/collect-orphans',
  );
  return res.data.data;
}

export async function scanVibeIconUrls(): Promise<IVibeIconUrlScanResult> {
  const res = await apiClient.post<{ success: boolean; data: IVibeIconUrlScanResult }>('/system/vibe-icons/scan-urls');
  return res.data.data;
}

export async function scanEmployeePhotos(): Promise<IEmployeePhotoUrlScanResult> {
  const res = await apiClient.post<{ success: boolean; data: IEmployeePhotoUrlScanResult }>('/system/warnings/scan-employee-photos');
  return res.data.data;
}

// ── Email Provider Configs ────────────────────────────────────────────────────

export interface IEmailProviderConfig {
  id: string;
  name: string;
  provider: string;
  fromName: string;
  fromEmail: string;
  isActive: boolean;
  isDisabled: boolean;
  note?: string | null;
  orderNo: number;
  logCreatedAt: string;
  logUpdatedAt: string;
}

export interface IEmailProviderConfigDetail extends IEmailProviderConfig {
  config: string; // JSON string with credentials
}

export interface ICreateEmailConfigDto {
  name: string;
  provider: string;
  config: string;
  fromName: string;
  fromEmail: string;
  note?: string;
}

export interface IUpdateEmailConfigDto {
  name?: string;
  provider?: string;
  config?: string;
  fromName?: string;
  fromEmail?: string;
  note?: string;
  isDisabled?: boolean;
}

export async function getEmailConfigs(): Promise<IEmailProviderConfig[]> {
  const res = await apiClient.get<{ success: boolean; data: IEmailProviderConfig[] }>('/email-configs');
  return safeArray(res.data.data);
}

export async function getEmailConfig(id: string): Promise<IEmailProviderConfigDetail> {
  const res = await apiClient.get<{ success: boolean; data: IEmailProviderConfigDetail }>(`/email-configs/${id}`);
  return res.data.data;
}

export async function createEmailConfig(dto: ICreateEmailConfigDto): Promise<IEmailProviderConfigDetail> {
  const res = await apiClient.post<{ success: boolean; data: IEmailProviderConfigDetail }>('/email-configs', dto);
  return res.data.data;
}

export async function updateEmailConfig(id: string, dto: IUpdateEmailConfigDto): Promise<IEmailProviderConfigDetail> {
  const res = await apiClient.put<{ success: boolean; data: IEmailProviderConfigDetail }>(`/email-configs/${id}`, dto);
  return res.data.data;
}

export async function activateEmailConfig(id: string): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.patch<{ success: boolean; message: string }>(`/email-configs/${id}/activate`);
  return res.data;
}

export async function deactivateEmailConfig(id: string): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.patch<{ success: boolean; message: string }>(`/email-configs/${id}/deactivate`);
  return res.data;
}

export async function deleteEmailConfig(id: string): Promise<void> {
  await apiClient.delete(`/email-configs/${id}`);
}

export async function sendTestEmail(id: string, to: string): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.post<{ success: boolean; message: string }>(`/email-configs/${id}/test`, { to });
  return res.data;
}

// ── System Warnings ───────────────────────────────────────────────────────────

export interface ISystemWarning {
  code: string;
  category: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  count: number;
  actionUrl?: string;
}

export async function getSystemWarnings(category?: string): Promise<ISystemWarning[]> {
  const res = await apiClient.get<{ success: boolean; data: ISystemWarning[] }>('/system/warnings', {
    params: category ? { category } : undefined,
  });
  return safeArray(res.data.data);
}

// ── Public Config (no auth) ───────────────────────────────────────────────────

export async function getPublicConfig(): Promise<Record<string, string>> {
  const res = await apiClient.get<{ success: boolean; data: Record<string, string> }>('/public/branding/config');
  return res.data.data;
}

// ── Data Integrity Checks ─────────────────────────────────────────────────────

/** Matches BE `IntegrityService.IIntegrityCheckSummary` (fn_ic_run_all()). */
export interface IIntegrityCheckSummary {
  checkId: string;
  checkName: string;
  category: string;
  severity: string;
  description: string | null;
  violationCount: number;
}

export interface IIntegrityCheckDetail {
  [key: string]: unknown;
}

export async function getIntegrityChecks(): Promise<IIntegrityCheckSummary[]> {
  const res = await apiClient.get<{ success: boolean; data: IIntegrityCheckSummary[] }>('/system/integrity-checks');
  return safeArray(res.data.data);
}

export async function getIntegrityCheckDetails(checkId: string): Promise<IIntegrityCheckDetail[]> {
  const res = await apiClient.get<{ success: boolean; data: IIntegrityCheckDetail[] }>(`/system/integrity-checks/${checkId}/details`);
  return safeArray(res.data.data);
}

// ── Session Blocked Users ─────────────────────────────────────────────────────

export interface ISessionBlockedUser {
  userId: string;
  staffId: string | null;
  username: string;
  email: string;
  fullName: string;
  allSessionsRevokedAt: string;
}

export async function getSessionBlockedUsers(): Promise<ISessionBlockedUser[]> {
  const res = await apiClient.get<{ success: boolean; data: ISessionBlockedUser[] }>('/system/warnings/session-blocked');
  return safeArray(res.data.data);
}


export interface IServerTimeResponse {
  serverUtcMs: number;
  serverUtcIso: string;
}

export async function getServerTime(): Promise<IServerTimeResponse> {
  const res = await apiClient.get<{ success: boolean; data: IServerTimeResponse }>('/system/test/server-time');
  return res.data.data;
}
