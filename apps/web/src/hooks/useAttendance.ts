import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStatuses,
  changeStatus,
  logoutWithMood,
  getTodayAttendance,
  getAttendanceHistory,
  getTeamHistory,
  getAttendanceConfig,
  type ICreateAttendanceDto,
  type ILogoutAttendanceDto,
  type IAttendanceHistoryParams,
  type ITeamHistoryParams,
} from '@/api/attendance.api';
import { useAuthStore } from '@/stores/auth.store';
import { RESOLVED_STATUSES_QUERY_KEY } from '@/lib/resolvedStatuses';

export const ATTENDANCE_KEYS = {
  statuses: RESOLVED_STATUSES_QUERY_KEY,
  today: ['attendance', 'today'] as const,
  history: (params?: IAttendanceHistoryParams) => ['attendance', 'history', params] as const,
  teamHistory: (params?: ITeamHistoryParams) => ['attendance', 'team', params] as const,
};

export function useStatuses() {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.statuses,
    queryFn: getStatuses,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  });
}

export function useChangeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ICreateAttendanceDto) => changeStatus({ ...dto, clientStartTime: new Date().toISOString() }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.today });
      void qc.invalidateQueries({ queryKey: ['attendance', 'history'] });
      void qc.invalidateQueries({ queryKey: ['attendance', 'team'] });
    },
  });
}

export function useLogoutWithMood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ILogoutAttendanceDto) => logoutWithMood(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.today });
      void qc.invalidateQueries({ queryKey: ['attendance', 'history'] });
      void qc.invalidateQueries({ queryKey: ['attendance', 'team'] });
    },
  });
}

export function useTodayAttendance() {
  const staffId = useAuthStore((s) => s.user?.staffId);

  return useQuery({
    queryKey: ATTENDANCE_KEYS.today,
    queryFn: getTodayAttendance,
    refetchInterval: 30_000,
    select: (records) => {
      if (!staffId) return records;
      const own = records.filter((r) => r.staffId === staffId);
      if (own.length !== records.length) {
        // Server should never return another user's records — log for investigation
        console.error(
          `[useTodayAttendance] DATA INTEGRITY: dropped ${records.length - own.length} record(s) with unexpected staffId. Expected: ${staffId}`,
        );
      }
      return own;
    },
  });
}

export function useAttendanceHistory(params?: IAttendanceHistoryParams) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.history(params),
    queryFn: () => getAttendanceHistory(params),
    refetchOnMount: 'always',
  });
}

export function useTeamHistory(params?: ITeamHistoryParams) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.teamHistory(params),
    queryFn: () => getTeamHistory(params),
    refetchOnMount: 'always',
  });
}

export function useAttendanceConfig() {
  return useQuery({
    queryKey: ['attendance', 'config'] as const,
    queryFn: getAttendanceConfig,
    staleTime: 5 * 60 * 1000,
  });
}
