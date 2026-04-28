import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutApi } from '@/api/auth.api';
import { useLogoutWithMood, useTodayAttendance } from '@/hooks/useAttendance';
import { useAuthStore } from '@/stores/auth.store';
import { usePublicConfig } from '@/hooks/useSystem';
import { safeArray } from '@/lib/safeArray';
import { queryClient } from '@/lib/queryClient';
import type { ITimeTracking } from '@/api/attendance.api';
import type { BreakContext } from '@/components/modals/OverBreakModal';

function parseMoodLogRoles(config: Record<string, string> | undefined): string[] {
  const raw = config?.['logout_config'];
  if (!raw) return ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'];
  try {
    const parsed = JSON.parse(raw) as { MoodLogRoles?: string[] };
    return Array.isArray(parsed.MoodLogRoles) ? parsed.MoodLogRoles : ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'];
  } catch {
    return ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'];
  }
}

function computeOverbreak(record: ITimeTracking | null): boolean {
  if (!record) return false;
  const max = record.status.maxDurationSeconds ?? 0;
  // Prefer clientStartTime (same machine as Date.now()) to avoid cross-machine skew.
  // Falls back to server startTime for rows where clientStartTime is unavailable.
  const refMs = new Date(record.clientStartTime ?? record.startTime).getTime();
  return (
    !!record.status.isBreak &&
    max > 0 &&
    Math.floor((Date.now() - refMs) / 1000) > max
  );
}

function buildBreakContext(record: ITimeTracking): BreakContext {
  // Same skew-free reference as computeOverbreak.
  const refMs = new Date(record.clientStartTime ?? record.startTime).getTime();
  const elapsedSeconds = Math.floor((Date.now() - refMs) / 1000);
  return {
    statusName: record.status.displayName ?? record.status.name,
    colorHex: record.status.colorHex,
    allowedSeconds: record.status.maxDurationSeconds ?? 0,
    overtimeSeconds: Math.max(0, elapsedSeconds - (record.status.maxDurationSeconds ?? 0)),
  };
}

export function useLogoutFlow() {
  const navigate = useNavigate();
  const { user, clearUser } = useAuthStore();
  const { data: publicConfig } = usePublicConfig();
  const [isMoodLogoutOpen, setIsMoodLogoutOpen] = useState(false);
  const [isLogoutOverbreakOpen, setIsLogoutOverbreakOpen] = useState(false);
  const [pendingOverbreakNotes, setPendingOverbreakNotes] = useState<string | undefined>(undefined);
  const [overbreakBreakContext, setOverbreakBreakContext] = useState<BreakContext | null>(null);
  const logoutWithMoodMutation = useLogoutWithMood();

  // Re-use the same React Query cache as EmployeeDashboardPage — no extra request
  const { data: _todayRecords } = useTodayAttendance();
  const todayRecords = safeArray<ITimeTracking>(_todayRecords);
  const currentRecord = user?.staffId
    ? (todayRecords.find((r) => !r.endTime && !r.isSuperseded) ?? null)
    : null;

  const doAuthLogout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // Ignore auth logout failure — still clear local session.
    }
    clearUser();
    queryClient.clear();
    void navigate('/login', { replace: true });
  }, [clearUser, navigate]);

  // Determine if this user must submit a mood log based on LogoutConfig
  const moodLogRoles = parseMoodLogRoles(publicConfig);
  const requiresMoodLog = (user?.roles ?? []).some((r) => moodLogRoles.includes(r));

  const startLogout = useCallback(() => {
    if (!user?.staffId) {
      void doAuthLogout();
      return;
    }

    if (computeOverbreak(currentRecord) && currentRecord && !currentRecord.isSuperseded) {
      setOverbreakBreakContext(buildBreakContext(currentRecord));
      setIsLogoutOverbreakOpen(true);
      return;
    }

    if (!requiresMoodLog) {
      // Skip M07 — call logout API directly without mood icon
      void logoutWithMoodMutation.mutateAsync(
        { overbreakNotes: undefined },
        {
          onSuccess: async () => { await doAuthLogout(); },
          onError: async () => { await doAuthLogout(); },
        },
      );
      return;
    }

    setIsMoodLogoutOpen(true);
  }, [doAuthLogout, user?.staffId, currentRecord, requiresMoodLog, logoutWithMoodMutation]);

  // Called when user confirms M03 on the logout path
  const confirmLogoutOverbreak = useCallback((notes: string) => {
    setIsLogoutOverbreakOpen(false);
    if (!requiresMoodLog) {
      // No mood log needed — logout immediately with overbreak notes
      void logoutWithMoodMutation.mutateAsync(
        { overbreakNotes: notes },
        {
          onSuccess: async () => { await doAuthLogout(); },
          onError: async () => { await doAuthLogout(); },
        },
      );
      return;
    }
    setPendingOverbreakNotes(notes);
    setIsMoodLogoutOpen(true);
  }, [requiresMoodLog, doAuthLogout, logoutWithMoodMutation]);

  const cancelLogoutOverbreak = useCallback(() => {
    setIsLogoutOverbreakOpen(false);
    setOverbreakBreakContext(null);
  }, []);

  const closeMoodLogout = useCallback(() => {
    setIsMoodLogoutOpen(false);
    setPendingOverbreakNotes(undefined);
  }, []);

  const confirmMoodLogout = useCallback(
    (vibeIconId: string, comment?: string) => {
      logoutWithMoodMutation.mutate(
        { vibeIconId, comment, overbreakNotes: pendingOverbreakNotes },
        {
          onSuccess: async () => {
            setIsMoodLogoutOpen(false);
            setPendingOverbreakNotes(undefined);
            await doAuthLogout();
          },
          onError: async () => {
            setIsMoodLogoutOpen(false);
            setPendingOverbreakNotes(undefined);
            await doAuthLogout();
          },
        },
      );
    },
    [doAuthLogout, logoutWithMoodMutation, pendingOverbreakNotes],
  );

  return {
    isMoodLogoutOpen,
    isLogoutOverbreakOpen,
    overbreakBreakContext,
    requiresMoodLog,
    startLogout,
    cancelLogoutOverbreak,
    closeMoodLogout,
    confirmMoodLogout,
    confirmLogoutOverbreak,
    isSubmitting: logoutWithMoodMutation.isPending,
  };
}

