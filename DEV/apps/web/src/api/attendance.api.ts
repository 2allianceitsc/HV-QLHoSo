import { apiClient } from '@/lib/axios';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IStatusDefinition {
  id: string;
  name: string;
  displayName?: string | null;
  colorHex?: string | null;
  iconId?: string | null;
  iconText?: string | null;
  iconUrl?: string | null;
  isLoginStatus: boolean;
  isLogoutStatus: boolean;
  isWorkingInStatus: boolean;
  isWorkingOutStatus: boolean;
  isBreak: boolean;
  isAbsent: boolean;
  maxDurationSeconds?: number | null;
  orderNo: number;
}

export interface ITimeTracking {
  id: string;
  staffId: string;
  statusId: string;
  startTime: string;
  endTime?: string | null;
  durationSeconds?: number | null;
  timezone?: string | null;
  notes?: string | null;
  debugInfo?: string | null;
  isLoginStatus?: boolean;
  isSuperseded?: boolean;
  logCreatedAt: string;
  /**
   * Browser UTC timestamp captured immediately before the POST /api/attendance call.
   * Use this — not startTime — as the reference for client-side elapsed-time calculations
   * (BreakCountdown, cooldown timer, overbreak check). Since both this value and Date.now()
   * originate from the same machine, the calculation is skew-free.
   * Null for auto-login rows and rows created before this field was added.
   */
  clientStartTime?: string | null;
  status: Pick<IStatusDefinition, 'id' | 'name' | 'displayName' | 'colorHex' | 'iconId' | 'iconText' | 'iconUrl' | 'isBreak' | 'isLogoutStatus' | 'maxDurationSeconds'>;
}

export interface ITeamTimeTracking extends ITimeTracking {
  staff: {
    id: string;
    firstName: string;
    surname: string;
    employeeId: string;
  };
}

export interface IVibeIcon {
  id: string;
  name: string;
  iconText?: string | null;
  hoverText?: string | null;
  category?: string | null;
  iconUrl?: string | null;
  emojiCode?: string | null;
  description?: string | null;
  orderNo: number;
}

export interface ICreateAttendanceDto {
  statusId: string;
  timezone?: string;
  notes?: string;
  /** Client-reported UTC ISO timestamp captured immediately before the API call. Used for clock-skew observability. */
  clientStartTime?: string;
}

export interface ILogoutAttendanceDto {
  vibeIconId?: string;
  comment?: string;
  overbreakNotes?: string;
}

export interface IUpdateAttendanceDto {
  startTime?: string;
  endTime?: string;
  notes?: string;
  statusId?: string;
}

export interface IAttendanceHistoryParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  statusId?: string;
  clientTimezone?: string;
}

export interface ITeamHistoryParams extends IAttendanceHistoryParams {
  staffId?: string;
}

export interface IPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function getStatuses(): Promise<IStatusDefinition[]> {
  const res = await apiClient.get<{ success: boolean; data: IStatusDefinition[] }>('/statuses');
  if (!Array.isArray(res.data.data)) {
    console.warn('[getStatuses] unexpected response shape:', res.data);
    return [];
  }
  return res.data.data;
}

export async function changeStatus(dto: ICreateAttendanceDto): Promise<ITimeTracking> {
  const res = await apiClient.post<{ success: boolean; data: ITimeTracking }>('/attendance', dto);
  return res.data.data;
}

export async function logoutWithMood(dto: ILogoutAttendanceDto): Promise<{ success: boolean }> {
  const res = await apiClient.post<{ success: boolean }>('/attendance/logout', dto);
  return res.data;
}

export async function getTodayAttendance(): Promise<ITimeTracking[]> {
  const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const res = await apiClient.get<{ success: boolean; data: ITimeTracking[] }>(
    '/attendance/today',
    { params: { clientTimezone } },
  );
  if (!Array.isArray(res.data.data)) {
    console.warn('[getTodayAttendance] unexpected response shape:', res.data);
    return [];
  }
  return res.data.data;
}

export async function getAttendanceHistory(
  params?: IAttendanceHistoryParams,
): Promise<{ data: ITimeTracking[]; pagination: IPagination }> {
  const res = await apiClient.get<{ success: boolean; data: { data: ITimeTracking[]; pagination: IPagination } }>(
    '/attendance/history',
    { params },
  );
  return res.data.data;
}

export async function getTeamHistory(
  params?: ITeamHistoryParams,
): Promise<{ data: ITeamTimeTracking[]; pagination: IPagination }> {
  const res = await apiClient.get<{ success: boolean; data: { data: ITeamTimeTracking[]; pagination: IPagination } }>(
    '/attendance/team',
    { params },
  );
  return res.data.data;
}

export async function updateAttendanceRecord(
  id: string,
  dto: IUpdateAttendanceDto,
): Promise<ITimeTracking> {
  const res = await apiClient.put<{ success: boolean; data: ITimeTracking }>(`/attendance/${id}`, dto);
  return res.data.data;
}

export async function deleteAttendanceRecord(id: string): Promise<void> {
  await apiClient.delete(`/attendance/${id}`);
}

export interface IAttendanceConfig {
  minStatusChangeIntervalSeconds: number;
  clockSkewWarningMs: number;
  /** Seconds after break expiry where a status change is still accepted without notes (network latency buffer). */
  breakGraceSeconds: number;
  /** Ms subtracted from minStatusChangeIntervalSeconds on the server to absorb clock skew (default 1000). */
  minStatusChangeGraceMs: number;
}

export async function getAttendanceConfig(): Promise<IAttendanceConfig> {
  const res = await apiClient.get<{ success: boolean; data: IAttendanceConfig }>('/attendance/config');
  return res.data.data;
}

export async function getServerUtcTime(): Promise<{ utcMs: number; utcIso: string }> {
  const res = await apiClient.get<{ success: boolean; data: { utcMs: number; utcIso: string } }>('/attendance/time');
  return res.data.data;
}

export async function getVibeIcons(): Promise<IVibeIcon[]> {
  const res = await apiClient.get<{ success: boolean; data: IVibeIcon[] }>('/vibe-icons');
  return res.data.data;
}
