import { apiClient } from '@/lib/axios';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IAttendanceRow {
  staffId: string;
  employeeId: string;
  firstName: string;
  surname: string;
  department: string | null;
  statusName: string;
  statusColorHex: string | null;
  isBreak: boolean;
  maxDurationSeconds: number | null;
  date: string;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  overbreakSeconds: number | null;
  notes: string | null;
}

export interface IHRReport {
  period: { startDate: string; endDate: string };
  totalStaff: number;
  activeStaff: number;
  totalWorkingDays: number;
  avgDailyAttendance: number;
  byDepartment: {
    departmentId: string;
    departmentName: string;
    staffCount: number;
    totalWorkingDays: number;
    avgDailyAttendance: number;
  }[];
  byStatus: {
    statusName: string;
    totalRecords: number;
    totalDurationSeconds: number;
  }[];
}

export interface IAttendanceReportParams {
  startDate: string;
  endDate: string;
  staffId?: string;
  departmentId?: string;
  clientId?: string;
  statusId?: string;
  groupBy?: 'day' | 'week' | 'month';
  page?: number;
  limit?: number;
  clientTimezone?: string;
}

export interface IPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: IPagination;
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function getAttendanceReport(
  params: IAttendanceReportParams,
): Promise<PaginatedResponse<IAttendanceRow>> {
  const res = await apiClient.get<{ success: boolean; data: PaginatedResponse<IAttendanceRow> }>('/reports/attendance', {
    params,
  });
  return res.data.data;
}

export async function exportAttendanceReport(
  params: Omit<IAttendanceReportParams, 'page' | 'limit'>,
): Promise<void> {
  const res = await apiClient.get('/reports/attendance/export', {
    params,
    responseType: 'blob',
  });

  const url = URL.createObjectURL(res.data as Blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `attendance-report-${params.startDate}-${params.endDate}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function getHRReport(params: {
  startDate: string;
  endDate: string;
}): Promise<IHRReport> {
  const res = await apiClient.get<{ success: boolean; data: IHRReport }>('/reports/hr', { params });
  return res.data.data;
}

// ── VIBE Report Types ─────────────────────────────────────────────────────────

export interface IVibeMoodLogEntry {
  loggedAt: string;
  icon: string | null;      // emojiCode snapshot
  iconUrl: string | null;   // iconUrl snapshot (for image-based icons)
  iconText: string | null;
  notes: string | null;
}

export interface IVibeByEmployeeRow {
  staffId: string;
  fullName: string;
  photo: string | null;
  moodLogs: IVibeMoodLogEntry[];
}

export interface IVibeByEmployeeResponse {
  date: string;
  data: IVibeByEmployeeRow[];
}

export interface IVibeByTimeStaffEntry {
  staffId: string;
  fullName: string;
  photo: string | null;
  department: string | null;
  team: string | null;
  position: string | null;
  loggedAt: string;
  notes: string | null;
}

export interface IVibeByTimeIconGroup {
  iconText: string;
  icon: string | null;      // emojiCode snapshot
  iconUrl: string | null;   // iconUrl snapshot
  count: number;
  staff: IVibeByTimeStaffEntry[];
}

export interface IVibeByTimeResponse {
  period: string;
  totalCount: number;
  icons: IVibeByTimeIconGroup[];
}

export interface IVibeTeamLeader {
  staffId: string;
  fullName: string;
  photo: string | null;
  staff: { staffId: string; fullName: string; photo: string | null }[];
}

export interface IVibeTeamStructureResponse {
  teamLeaders: IVibeTeamLeader[];
  directReports: { staffId: string; fullName: string; photo: string | null }[];
}

export interface IVibeStaffRow {
  staffId: string;
  fullName: string;
  photo: string | null;
  teamName: string | null;
  clientName: string | null;
}

export interface IVibeStaffByClientTeam {
  teamId: string;
  teamName: string;
  staff: { staffId: string; fullName: string; photo: string | null }[];
}

export interface IVibeStaffByClientGroup {
  clientId: string;
  clientName: string;
  teams: IVibeStaffByClientTeam[];
}

// ── VIBE Report API functions ─────────────────────────────────────────────────

export async function getVibeByEmployee(params: {
  date?: string;
  clientId?: string;
  teamId?: string;
  officeId?: string;
}): Promise<IVibeByEmployeeResponse> {
  const res = await apiClient.get<{ success: boolean; data: IVibeByEmployeeResponse }>(
    '/reports/vibe/by-employee',
    { params },
  );
  return res.data.data;
}

export async function getVibeByTime(params: {
  period?: 'day' | 'week' | 'month' | 'year';
  clientId?: string;
  teamId?: string;
  officeId?: string;
}): Promise<IVibeByTimeResponse> {
  const res = await apiClient.get<{ success: boolean; data: IVibeByTimeResponse }>(
    '/reports/vibe/by-time',
    { params },
  );
  return res.data.data;
}

export async function getVibeTeamStructure(): Promise<IVibeTeamStructureResponse> {
  const res = await apiClient.get<{ success: boolean; data: IVibeTeamStructureResponse }>(
    '/reports/vibe/team-structure',
  );
  return res.data.data;
}

export async function getVibeAllStaffs(params: {
  search?: string;
}): Promise<IVibeStaffRow[]> {
  const res = await apiClient.get<{ success: boolean; data: IVibeStaffRow[] }>(
    '/reports/vibe/all-staffs',
    { params },
  );
  return res.data.data ?? [];
}

export async function getVibeStaffsByClient(params: {
  search?: string;
}): Promise<IVibeStaffByClientGroup[]> {
  const res = await apiClient.get<{ success: boolean; data: IVibeStaffByClientGroup[] }>(
    '/reports/vibe/staffs-by-client',
    { params },
  );
  return res.data.data ?? [];
}

// ── Attendance sub-report types (T2-T6) ───────────────────────────────────────

export interface IAttendanceSubParams {
  startDate: string;
  endDate: string;
  companyId?: string;
  departmentId?: string;
  officeId?: string;
  clientId?: string;
  teamId?: string;
  staffId?: string;
  clientTimezone?: string;
}

// T2: Late Arrivals
export interface ILateArrivalDetail {
  date: string;
  startTime: string;
  latestStartTime: string;
  lateMinutes: number;
}
export interface ILateArrivalStaff {
  staffId: string;
  firstName: string;
  surname: string;
  photo: string | null;
  lateCount: number;
  avgLateMinutes: number;
  details: ILateArrivalDetail[];
}
export interface ILateArrivalsResponse {
  data: ILateArrivalStaff[];
  total: number;
}

// T3: Over-Break
export interface IOverBreakDetail {
  date: string;
  statusName: string;
  statusColorHex: string | null;
  durationSeconds: number;
  maxBreakSeconds: number;
  excessSeconds: number;
  notes: string | null;
}
export interface IOverBreakStaff {
  staffId: string;
  firstName: string;
  surname: string;
  photo: string | null;
  overBreakCount: number;
  totalExcessSeconds: number;
  details: IOverBreakDetail[];
}
export interface IOverBreaksResponse {
  data: IOverBreakStaff[];
  total: number;
}

// T4: Auto-Logout
export interface IAutoLogoutDetail {
  date: string;
  time: string;
  type: 'shift-end' | 'end-of-day';
}
export interface IAutoLogoutStaff {
  staffId: string;
  firstName: string;
  surname: string;
  photo: string | null;
  totalCount: number;
  shiftEndCount: number;
  endOfDayCount: number;
  details: IAutoLogoutDetail[];
}
export interface IAutoLogoutsResponse {
  data: IAutoLogoutStaff[];
  total: number;
}

// T5: Absences
export interface IAbsenceStaff {
  staffId: string;
  firstName: string;
  surname: string;
  photo: string | null;
  absentDays: number;
  normalDayOff: number;
  halfDayOff: number;
  totalDays: number;
}
export interface IAbsencesResponse {
  data: IAbsenceStaff[];
  total: number;
}

// T6: Overtime
export interface IOvertimeDetail {
  date: string;
  overtimeSeconds: number;
}
export interface IOvertimeStaff {
  staffId: string;
  firstName: string;
  surname: string;
  photo: string | null;
  totalOvertimeSeconds: number;
  details: IOvertimeDetail[];
}
export interface IOvertimeResponse {
  data: IOvertimeStaff[];
  total: number;
}

// ── HR sub-report types (T2-T3) ───────────────────────────────────────────────

export interface IHeadcountGroup {
  label: string;
  count: number;
  percentage: number;
}
export interface IHeadcountResponse {
  total: number;
  groups: IHeadcountGroup[];
}

export interface IBirthdayStaff {
  id: string;
  firstName: string;
  surname: string;
  photo: string | null;
  photoBirthday: string | null;
  dateOfBirth: string;
  age: number;
  department: string | null;
  office: string | null;
  favoriteCake: string | null;
  daysUntilBirthday: number;
}
export interface IBirthdaysResponse {
  staffs: IBirthdayStaff[];
}

// ── Timezone report types ─────────────────────────────────────────────────────

export interface ITimezoneStaff {
  id: string;
  fullName: string;
  photo: string | null;
  office: string | null;
  team: string | null;
  client: string | null;
  timezoneSource: 'staff' | 'office' | 'company';
  isDifferentFromOffice: boolean;
}
export interface ITimezoneGroup {
  timezone: string;
  staffCount: number;
  staffs: ITimezoneStaff[];
}
export interface ITimezoneTab1 {
  groups: ITimezoneGroup[];
}

export interface ITimezoneMismatchStaff {
  id: string;
  fullName: string;
  photo: string | null;
  staffTimezone: string | null;
  officeTimezone: string | null;
  companyTimezone: string | null;
  clientTimezone: string | null;
  mismatches: ('office' | 'company' | 'client')[];
}
export interface ITimezoneTab2 {
  staffs: ITimezoneMismatchStaff[];
}
export interface ITimezoneReportResponse {
  tab1: ITimezoneTab1;
  tab2: ITimezoneTab2;
}

export interface ITimezoneScopeParams {
  companyId?: string;
  officeId?: string;
  clientId?: string;
  teamId?: string;
}

// ── Working hours report types ────────────────────────────────────────────────

export interface IWorkingHoursRow {
  staffId: string;
  firstName: string;
  surname: string;
  photo: string | null;
  shiftSeconds: number;
  actualWorkingSeconds: number;
  breakSeconds: number;
  overtimeSeconds: number;
  utilization: number | null;
}
export interface IWorkingHoursResponse {
  data: IWorkingHoursRow[];
  total: number;
}

export interface IWorkingHoursParams {
  startDate: string;
  endDate: string;
  companyId?: string;
  officeId?: string;
  clientId?: string;
  teamId?: string;
  clientTimezone?: string;
}

// ── Staff allocation types ────────────────────────────────────────────────────

export interface IStaffAllocationStaff {
  id: string;
  firstName: string;
  surname: string;
  photo: string | null;
  position: string | null;
  office: string | null;
}
export interface IStaffAllocationTeam {
  id: string;
  name: string;
  managerName: string | null;
  staffCount: number;
  staffs: IStaffAllocationStaff[];
}
export interface IStaffAllocationProject {
  id: string;
  name: string;
  code: string | null;
  staffCount: number;
  staffs: { id: string; firstName: string; surname: string }[];
}
export interface IStaffAllocationClient {
  id: string;
  clientName: string;
  staffCount: number;
  teamCount: number;
  projectCount: number;
  teams: IStaffAllocationTeam[];
  projects: IStaffAllocationProject[];
}
export interface IStaffAllocationResponse {
  clients: IStaffAllocationClient[];
}


// ── S25 T7: Daily Log types ───────────────────────────────────────────────────

export interface IDailyLogParams {
  startDate: string;
  endDate: string;
  staffId?: string;
  companyId?: string;
  departmentId?: string;
  teamId?: string;
  clientTimezone?: string;
}

export interface IDailyLogRow {
  staffId: string;
  staffName: string;
  date: string;
  onDuty: string | null;
  offDuty: string | null;
  login: string | null;
  logout: string | null;
  hoursWorkedSeconds: number;
  lateArrival: boolean;
  earlyDeparture: boolean;
  breakExceeded: boolean;
  autoLogout: boolean;
}

export interface IDailyLogResponse {
  data: IDailyLogRow[];
  total: number;
}

// ── S26 T4: Weekly Grid types ─────────────────────────────────────────────────

export interface IWeeklyGridParams {
  weekStart: string;
  companyId?: string;
  departmentId?: string;
  teamId?: string;
  staffId?: string;
  clientTimezone?: string;
}

export interface IWeeklyGridDay {
  date: string;
  late: boolean;
  lateMinutes: number;
  undertime: boolean;
  undertimeMinutes: number;
  unproductive: boolean;
  overBreak: boolean;
  overBreakCount: number;
  absent: boolean;
}

export interface IWeeklyGridStaff {
  no: number;
  staffId: string;
  employeeNo: string;
  staffName: string;
  days: IWeeklyGridDay[];
}

export interface IWeeklyGridResponse {
  data: IWeeklyGridStaff[];
  weekDates: string[];
}
// ── New API functions ─────────────────────────────────────────────────────────

export async function getLateArrivals(params: IAttendanceSubParams): Promise<ILateArrivalsResponse> {
  const res = await apiClient.get<{ success: boolean; data: ILateArrivalsResponse }>(
    '/reports/attendance/late-arrivals',
    { params },
  );
  return res.data.data;
}

export async function getOverBreaks(params: IAttendanceSubParams): Promise<IOverBreaksResponse> {
  const res = await apiClient.get<{ success: boolean; data: IOverBreaksResponse }>(
    '/reports/attendance/over-breaks',
    { params },
  );
  return res.data.data;
}

export async function getAutoLogouts(params: IAttendanceSubParams): Promise<IAutoLogoutsResponse> {
  const res = await apiClient.get<{ success: boolean; data: IAutoLogoutsResponse }>(
    '/reports/attendance/auto-logouts',
    { params },
  );
  return res.data.data;
}

export async function getAbsences(params: IAttendanceSubParams): Promise<IAbsencesResponse> {
  const res = await apiClient.get<{ success: boolean; data: IAbsencesResponse }>(
    '/reports/attendance/absences',
    { params },
  );
  return res.data.data;
}

export async function getOvertime(params: IAttendanceSubParams): Promise<IOvertimeResponse> {
  const res = await apiClient.get<{ success: boolean; data: IOvertimeResponse }>(
    '/reports/attendance/overtime',
    { params },
  );
  return res.data.data;
}

export async function getHrHeadcount(params: {
  groupBy: 'department' | 'office' | 'team' | 'client';
  companyId?: string;
}): Promise<IHeadcountResponse> {
  const res = await apiClient.get<{ success: boolean; data: IHeadcountResponse }>(
    '/reports/hr/headcount',
    { params },
  );
  return res.data.data;
}

export async function getHrBirthdays(params: {
  period: 'this-month' | 'next-month' | 'next-week';
}): Promise<IBirthdaysResponse> {
  const res = await apiClient.get<{ success: boolean; data: IBirthdaysResponse }>(
    '/reports/hr/birthdays',
    { params },
  );
  return res.data.data;
}

export async function getTimezoneReport(params: ITimezoneScopeParams): Promise<ITimezoneReportResponse> {
  const res = await apiClient.get<{ success: boolean; data: ITimezoneReportResponse }>(
    '/reports/timezone',
    { params },
  );
  return res.data.data;
}

export async function getWorkingHours(params: IWorkingHoursParams): Promise<IWorkingHoursResponse> {
  const res = await apiClient.get<{ success: boolean; data: IWorkingHoursResponse }>(
    '/reports/working-hours',
    { params },
  );
  return res.data.data;
}

export async function exportWorkingHours(params: IWorkingHoursParams): Promise<void> {
  const res = await apiClient.get('/reports/working-hours/export', {
    params,
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data as Blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `working-hours-${params.startDate}-${params.endDate}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function getStaffAllocation(params: {
  companyId?: string;
}): Promise<IStaffAllocationResponse> {
  const res = await apiClient.get<{ success: boolean; data: IStaffAllocationResponse }>(
    '/reports/staff-allocation',
    { params },
  );
  return res.data.data;
}
export async function getDailyLog(params: IDailyLogParams): Promise<IDailyLogResponse> {
  const res = await apiClient.get<{ success: boolean; data: IDailyLogResponse }>(
    '/reports/attendance/daily-log',
    { params },
  );
  return res.data.data;
}

export async function exportDailyLog(params: IDailyLogParams): Promise<void> {
  const res = await apiClient.get('/reports/attendance/daily-log/export', {
    params,
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data as Blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const start = params.startDate.replace(/-/g, '');
  const end = params.endDate.replace(/-/g, '');
  anchor.download = `DailyAttendanceLog_${start}_${end}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function getWeeklyGrid(params: IWeeklyGridParams): Promise<IWeeklyGridResponse> {
  const res = await apiClient.get<{ success: boolean; data: IWeeklyGridResponse }>(
    '/reports/hr/weekly-grid',
    { params },
  );
  return res.data.data;
}

export async function exportWeeklyGrid(params: IWeeklyGridParams): Promise<void> {
  const weekEnd = new Date(params.weekStart + 'T00:00:00Z');
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 4);
  const start = params.weekStart.replace(/-/g, '');
  const end = weekEnd.toISOString().slice(0, 10).replace(/-/g, '');

  const res = await apiClient.get('/reports/hr/weekly-grid/export', {
    params,
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data as Blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `WeeklyAttendanceGrid_${start}_${end}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// ── S26 Tab 5: Disabled Managers ─────────────────────────────────────────────

export interface IDisabledManagerRow {
  rowId: string;
  scopeType: 'Company' | 'Department' | 'Office' | 'Team';
  scopeId: string;
  scopeName: string;
  staffId: string;
  staffName: string;
  staffEmployeeId: string;
  disabledSince?: string;
}

export async function getDisabledManagersWarning(): Promise<IDisabledManagerRow[]> {
  const res = await apiClient.get<{ success: boolean; data: IDisabledManagerRow[] }>(
    '/reports/disabled-managers',
  );
  return res.data.data ?? [];
}