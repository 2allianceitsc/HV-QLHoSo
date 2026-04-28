import { useQuery, useMutation } from '@tanstack/react-query';
import {
  getAttendanceReport,
  exportAttendanceReport,
  getHRReport,
  getVibeByEmployee,
  getVibeByTime,
  getVibeTeamStructure,
  getVibeAllStaffs,
  getVibeStaffsByClient,
  getLateArrivals,
  getOverBreaks,
  getAutoLogouts,
  getAbsences,
  getOvertime,
  getHrHeadcount,
  getHrBirthdays,
  getTimezoneReport,
  getWorkingHours,
  exportWorkingHours,
  getStaffAllocation,
  type IAttendanceReportParams,
  type IAttendanceSubParams,
  type ITimezoneScopeParams,
  type IWorkingHoursParams,
  getDailyLog,
  getWeeklyGrid,
  exportDailyLog,
  exportWeeklyGrid,
  type IDailyLogParams,
  type IWeeklyGridParams,
  getDisabledManagersWarning,
} from '@/api/reports.api';

export const REPORTS_KEYS = {
  attendance: (params: IAttendanceReportParams) => ['reports', 'attendance', params] as const,
  hr: (params: { startDate: string; endDate: string }) => ['reports', 'hr', params] as const,
  vibeByEmployee: (params: { date?: string; clientId?: string; teamId?: string; officeId?: string }) =>
    ['reports', 'vibe', 'by-employee', params] as const,
  vibeByTime: (params: { period?: string; clientId?: string; teamId?: string; officeId?: string }) =>
    ['reports', 'vibe', 'by-time', params] as const,
  vibeTeamStructure: () => ['reports', 'vibe', 'team-structure'] as const,
  vibeAllStaffs: (search?: string) => ['reports', 'vibe', 'all-staffs', search] as const,
  vibeStaffsByClient: (search?: string) => ['reports', 'vibe', 'staffs-by-client', search] as const,
  lateArrivals: (params: IAttendanceSubParams) => ['reports', 'attendance', 'late-arrivals', params] as const,
  overBreaks: (params: IAttendanceSubParams) => ['reports', 'attendance', 'over-breaks', params] as const,
  autoLogouts: (params: IAttendanceSubParams) => ['reports', 'attendance', 'auto-logouts', params] as const,
  absences: (params: IAttendanceSubParams) => ['reports', 'attendance', 'absences', params] as const,
  overtime: (params: IAttendanceSubParams) => ['reports', 'attendance', 'overtime', params] as const,
  hrHeadcount: (params: { groupBy: 'department' | 'office' | 'team' | 'client'; companyId?: string }) =>
    ['reports', 'hr', 'headcount', params] as const,
  hrBirthdays: (period: 'this-month' | 'next-month' | 'next-week') =>
    ['reports', 'hr', 'birthdays', period] as const,
  timezone: (params: ITimezoneScopeParams) => ['reports', 'timezone', params] as const,
  workingHours: (params: IWorkingHoursParams) => ['reports', 'working-hours', params] as const,
  staffAllocation: (companyId?: string) => ['reports', 'staff-allocation', companyId] as const,
  dailyLog: (params: IDailyLogParams) => ['reports', 'attendance', 'daily-log', params] as const,
  weeklyGrid: (params: IWeeklyGridParams) => ['reports', 'hr', 'weekly-grid', params] as const,
};

export function useAttendanceReport(params: IAttendanceReportParams) {
  return useQuery({
    queryKey: REPORTS_KEYS.attendance(params),
    queryFn: () => getAttendanceReport(params),
    enabled: !!(params.startDate && params.endDate),
  });
}

export function useHRReport(params: { startDate: string; endDate: string }) {
  return useQuery({
    queryKey: REPORTS_KEYS.hr(params),
    queryFn: () => getHRReport(params),
    enabled: !!(params.startDate && params.endDate),
  });
}

export function useExportReport() {
  return useMutation({
    mutationFn: (params: Omit<IAttendanceReportParams, 'page' | 'limit'>) =>
      exportAttendanceReport(params),
  });
}

// ── VIBE Report hooks ─────────────────────────────────────────────────────────

export function useVibeByEmployee(params: { date?: string; clientId?: string; teamId?: string; officeId?: string }) {
  return useQuery({
    queryKey: REPORTS_KEYS.vibeByEmployee(params),
    queryFn: () => getVibeByEmployee(params),
  });
}

export function useVibeByTime(params: { period?: 'day' | 'week' | 'month' | 'year'; clientId?: string; teamId?: string; officeId?: string }) {
  return useQuery({
    queryKey: REPORTS_KEYS.vibeByTime(params),
    queryFn: () => getVibeByTime(params),
  });
}

export function useVibeTeamStructure() {
  return useQuery({
    queryKey: REPORTS_KEYS.vibeTeamStructure(),
    queryFn: () => getVibeTeamStructure(),
  });
}

export function useVibeAllStaffs(search?: string) {
  return useQuery({
    queryKey: REPORTS_KEYS.vibeAllStaffs(search),
    queryFn: () => getVibeAllStaffs({ search }),
  });
}

export function useVibeStaffsByClient(search?: string) {
  return useQuery({
    queryKey: REPORTS_KEYS.vibeStaffsByClient(search),
    queryFn: () => getVibeStaffsByClient({ search }),
  });
}

// ── Attendance sub-report hooks ───────────────────────────────────────────────

export function useLateArrivals(params: IAttendanceSubParams) {
  return useQuery({
    queryKey: REPORTS_KEYS.lateArrivals(params),
    queryFn: () => getLateArrivals(params),
    enabled: !!(params.startDate && params.endDate),
  });
}

export function useOverBreaks(params: IAttendanceSubParams) {
  return useQuery({
    queryKey: REPORTS_KEYS.overBreaks(params),
    queryFn: () => getOverBreaks(params),
    enabled: !!(params.startDate && params.endDate),
  });
}

export function useAutoLogouts(params: IAttendanceSubParams) {
  return useQuery({
    queryKey: REPORTS_KEYS.autoLogouts(params),
    queryFn: () => getAutoLogouts(params),
    enabled: !!(params.startDate && params.endDate),
  });
}

export function useAbsences(params: IAttendanceSubParams) {
  return useQuery({
    queryKey: REPORTS_KEYS.absences(params),
    queryFn: () => getAbsences(params),
    enabled: !!(params.startDate && params.endDate),
  });
}

export function useOvertime(params: IAttendanceSubParams) {
  return useQuery({
    queryKey: REPORTS_KEYS.overtime(params),
    queryFn: () => getOvertime(params),
    enabled: !!(params.startDate && params.endDate),
  });
}

// ── HR sub-report hooks ───────────────────────────────────────────────────────

export function useHrHeadcount(params: {
  groupBy: 'department' | 'office' | 'team' | 'client';
  companyId?: string;
}) {
  return useQuery({
    queryKey: REPORTS_KEYS.hrHeadcount(params),
    queryFn: () => getHrHeadcount(params),
  });
}

export function useHrBirthdays(period: 'this-month' | 'next-month' | 'next-week') {
  return useQuery({
    queryKey: REPORTS_KEYS.hrBirthdays(period),
    queryFn: () => getHrBirthdays({ period }),
  });
}

// ── Timezone report hook ──────────────────────────────────────────────────────

export function useTimezoneReport(params: ITimezoneScopeParams) {
  return useQuery({
    queryKey: REPORTS_KEYS.timezone(params),
    queryFn: () => getTimezoneReport(params),
  });
}

// ── Working hours hooks ───────────────────────────────────────────────────────

export function useWorkingHours(params: IWorkingHoursParams) {
  return useQuery({
    queryKey: REPORTS_KEYS.workingHours(params),
    queryFn: () => getWorkingHours(params),
    enabled: !!(params.startDate && params.endDate),
  });
}

export function useExportWorkingHours() {
  return useMutation({
    mutationFn: (params: IWorkingHoursParams) => exportWorkingHours(params),
  });
}

// ── Staff allocation hook ─────────────────────────────────────────────────────

export function useStaffAllocation(companyId?: string) {
  return useQuery({
    queryKey: REPORTS_KEYS.staffAllocation(companyId),
    queryFn: () => getStaffAllocation({ companyId }),
  });
}
// ── S25 T7: Daily Log hooks ───────────────────────────────────────────────────

export function useDailyLog(params: IDailyLogParams) {
  return useQuery({
    queryKey: REPORTS_KEYS.dailyLog(params),
    queryFn: () => getDailyLog(params),
    enabled: !!(params.startDate && params.endDate),
  });
}

export function useExportDailyLog() {
  return useMutation({
    mutationFn: (params: IDailyLogParams) => exportDailyLog(params),
  });
}

// ── S26 T4: Weekly Grid hooks ─────────────────────────────────────────────────

export function useWeeklyGrid(params: IWeeklyGridParams) {
  return useQuery({
    queryKey: REPORTS_KEYS.weeklyGrid(params),
    queryFn: () => getWeeklyGrid(params),
    enabled: !!params.weekStart,
  });
}

export function useExportWeeklyGrid() {
  return useMutation({
    mutationFn: (params: IWeeklyGridParams) => exportWeeklyGrid(params),
  });
}

// ── S26 T5: Disabled Managers hook ───────────────────────────────────────────

export function useDisabledManagers() {
  return useQuery({
    queryKey: ['reports', 'disabled-managers'],
    queryFn: () => getDisabledManagersWarning(),
  });
}