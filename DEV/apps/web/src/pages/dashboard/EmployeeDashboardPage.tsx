import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { calcCooldownRemaining } from '@/components/attendance/attendance-ui';
import { format } from 'date-fns';
import { useStatuses, useChangeStatus, useTodayAttendance, useAttendanceConfig } from '@/hooks/useAttendance';
import { StatusCard } from '@/components/attendance/StatusCard';
import { StatusPicker } from '@/components/attendance/StatusPicker';
import { OverBreakModal, type BreakContext } from '@/components/modals/OverBreakModal';
import { MoodLogoutModal } from '@/components/modals/MoodLogoutModal';
import { OverbreakBadge, calcOverbreakSeconds } from '@/components/attendance/OverbreakBadge';
import type { ITimeTracking, IStatusDefinition } from '@/api/attendance.api';
import { safeArray } from '@/lib/safeArray';
import { useLogoutFlow } from '@/hooks/useLogoutFlow';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage, getE205RetryAfter } from '@/lib/apiError';

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function EmployeeDashboardPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN') ?? false;
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOverbreakActive, setIsOverbreakActive] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [breakContext, setBreakContext] = useState<BreakContext | null>(null);
  const [isOverBreakOpen, setIsOverBreakOpen] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Drives the cooldown countdown when no record-based interval is active
  // (optimistic on click, or restarted from server's retryAfterSeconds on E205).
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const {
    isMoodLogoutOpen,
    isLogoutOverbreakOpen,
    overbreakBreakContext,
    startLogout: handleLogout,
    cancelLogoutOverbreak,
    closeMoodLogout,
    confirmMoodLogout: handleMoodLogoutConfirm,
    confirmLogoutOverbreak: handleLogoutOverbreakConfirm,
  } = useLogoutFlow();
  const { toast } = useToast();

  const { data: attendanceConfig } = useAttendanceConfig();
  const minInterval = attendanceConfig?.minStatusChangeIntervalSeconds ?? 3;
  const breakGraceSeconds = attendanceConfig?.breakGraceSeconds ?? 2;

  const { data: _statuses } = useStatuses();
  const { data: _todayRecords, isLoading: isTodayLoading } = useTodayAttendance();
  const statuses = safeArray<IStatusDefinition>(_statuses);
  const todayRecords = safeArray<ITimeTracking>(_todayRecords);
  const changeStatusMutation = useChangeStatus();

  // Current session = open row that has not been superseded by a newer login.
  const currentRecord: ITimeTracking | null = todayRecords.find((r) => !r.endTime && !r.isSuperseded) ?? null;
  const currentStatusId = currentRecord?.statusId ?? null;

  // Reset overbreak state whenever the current record changes (status changed successfully).
  // Also rehydrates overbreak on page load/refresh: if the open record is already past its
  // break limit, set isOverbreakActive=true so the modal fires on the next status pick.
  // Without this, a page refresh wipes React state and the user can silently fire the API
  // without notes, getting a silent 400 and being unable to change status (BUG-008).
  useEffect(() => {
    // Clear any pending grace timer when the current record changes (status changed successfully).
    if (graceTimerRef.current) {
      clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
    }
    setPendingStatusId(null);
    setBreakContext(null);
    setIsOverBreakOpen(false);

    if (!currentRecord) {
      setIsOverbreakActive(false);
      return;
    }

    const max = currentRecord.status.maxDurationSeconds ?? 0;
    // Prefer clientStartTime (same machine as Date.now()) to avoid cross-machine skew.
    const refMs = new Date(currentRecord.clientStartTime ?? currentRecord.startTime).getTime();
    // Use breakGraceSeconds so a page-refresh within the grace window doesn't immediately
    // trigger the overbreak modal — the server would still accept the click without notes.
    const alreadyOver =
      !!currentRecord.status.isBreak &&
      max > 0 &&
      Math.floor((Date.now() - refMs) / 1000) > max + breakGraceSeconds;

    setIsOverbreakActive(alreadyOver);
  }, [currentRecord?.id, breakGraceSeconds]);

  // When server confirms the new status, start actual time-based countdown.
  // Also clears any manual cooldown timer so the two don't fight.
  useEffect(() => {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    if (!currentRecord?.startTime || minInterval <= 0) return;
    // Prefer clientStartTime (same machine as Date.now()) to avoid cross-machine skew.
    // Falls back to server startTime for rows where clientStartTime is unavailable.
    const refMs = new Date(currentRecord.clientStartTime ?? currentRecord.startTime).getTime();
    const elapsed = (Date.now() - refMs) / 1000;
    if (elapsed >= minInterval) {
      setCooldownRemaining(0);
      return;
    }
    const tick = () => {
      const remaining = calcCooldownRemaining(refMs, Date.now(), minInterval);
      setCooldownRemaining(remaining);
      if (remaining <= 0) clearInterval(timerId);
    };
    const timerId = setInterval(tick, 200);
    tick();
    return () => clearInterval(timerId);
  }, [currentRecord?.startTime, currentRecord?.clientStartTime, minInterval]);

  // Start a self-contained countdown for `seconds`. Used for:
  //   1. Optimistic disable on click (prevents double-submit while request is in flight)
  //   2. E205 recovery — restart from server's retryAfterSeconds so the UI un-freezes
  // Pass 0 to clear immediately (e.g. on non-E205 error so user can retry right away).
  const startManualCooldown = useCallback((seconds: number) => {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    if (seconds <= 0) { setCooldownRemaining(0); return; }
    setCooldownRemaining(Math.ceil(seconds));
    cooldownTimerRef.current = setInterval(() => {
      setCooldownRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(cooldownTimerRef.current!);
          cooldownTimerRef.current = null;
          return 0;
        }
        return next;
      });
    }, 1000);
  }, []);

  const handleBreakExpired = useCallback(() => {
    // Grace period: delay overbreak activation so a click within breakGraceSeconds of expiry
    // goes through without a notes modal (server also accepts it). After the grace window,
    // mark overbreak so the next status pick opens M03.
    if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    graceTimerRef.current = setTimeout(() => {
      setIsOverbreakActive(true);
    }, breakGraceSeconds * 1000);
  }, [breakGraceSeconds]);

  useEffect(() => {
    return () => {
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  const handleSelectStatus = useCallback(
    (statusId: string) => {
      // If we're in overbreak and the current record is a real (non-superseded) session,
      // intercept the selection: store the pending status and open the overbreak note modal.
      if (isOverbreakActive && currentRecord && !currentRecord.isSuperseded) {
        // Prefer clientStartTime (same machine as Date.now()) to avoid cross-machine skew.
        const refMs = new Date(currentRecord.clientStartTime ?? currentRecord.startTime).getTime();
        const elapsedSeconds = Math.floor((Date.now() - refMs) / 1000);
        setPendingStatusId(statusId);
        setBreakContext({
          statusName: currentRecord.status.displayName ?? currentRecord.status.name,
          colorHex: currentRecord.status.colorHex,
          allowedSeconds: currentRecord.status.maxDurationSeconds ?? 0,
          overtimeSeconds: Math.max(0, elapsedSeconds - (currentRecord.status.maxDurationSeconds ?? 0)),
        });
        setIsOverBreakOpen(true);
        return;
      }
      // Optimistic cooldown: prevents double-click while request is in-flight.
      // startManualCooldown drives the countdown; on success the record-based useEffect
      // takes over; on E205 we restart from the server's retryAfterSeconds.
      startManualCooldown(minInterval);
      changeStatusMutation.mutate(
        { statusId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, clientStartTime: new Date().toISOString() },
        {
          onError: (err) => {
            const retryAfter = getE205RetryAfter(err);
            if (retryAfter !== null) {
              // Server says the cooldown hasn't elapsed yet (clock skew edge case).
              // Restart the countdown from the server's remaining seconds so the UI
              // counts down to 0 and re-enables — no freeze.
              startManualCooldown(retryAfter);
              toast({ variant: 'destructive', title: 'Please wait', description: `Change status again in ${retryAfter}s.` });
              return;
            }
            const msg = getApiErrorMessage(err);
            if (msg.includes('Break time exceeded') && currentRecord) {
              // Grace period elapsed before request reached server — recover by opening M03.
              startManualCooldown(0);
              const refMs = new Date(currentRecord.clientStartTime ?? currentRecord.startTime).getTime();
              const elapsedSeconds = Math.floor((Date.now() - refMs) / 1000);
              setPendingStatusId(statusId);
              setBreakContext({
                statusName: currentRecord.status.displayName ?? currentRecord.status.name,
                colorHex: currentRecord.status.colorHex,
                allowedSeconds: currentRecord.status.maxDurationSeconds ?? 0,
                overtimeSeconds: Math.max(0, elapsedSeconds - (currentRecord.status.maxDurationSeconds ?? 0)),
              });
              setIsOverbreakActive(true);
              setIsOverBreakOpen(true);
            } else {
              // Other server errors: clear the optimistic cooldown so user can retry.
              startManualCooldown(0);
              toast({ variant: 'destructive', title: 'Status change failed', description: msg });
            }
          },
        },
      );
    },
    [isOverbreakActive, currentRecord, changeStatusMutation, toast, minInterval, startManualCooldown],
  );

  const handleOverBreakConfirm = useCallback(
    (notes: string) => {
      if (!pendingStatusId) return;
      changeStatusMutation.mutate(
        {
          statusId: pendingStatusId,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          notes,
        },
        {
          onSuccess: () => {
            setIsOverBreakOpen(false);
            setPendingStatusId(null);
            // isOverbreakActive cleared by useEffect when currentRecord.id changes
          },
          onError: (err) => {
            toast({ variant: 'destructive', title: 'Status change failed', description: getApiErrorMessage(err) });
          },
        },
      );
    },
    [pendingStatusId, changeStatusMutation, toast],
  );

  const handleOverBreakCancel = useCallback(() => {
    setPendingStatusId(null);
    setIsOverBreakOpen(false);
  }, []);

  // When the floating widget detects an overbreak click, it navigates here with
  // ?pendingStatusId=xxx. Once isOverbreakActive is resolved, forward to M03 modal.
  const pendingStatusIdHandledRef = useRef<string | null>(null);
  useEffect(() => {
    const urlPendingId = searchParams.get('pendingStatusId');
    if (!urlPendingId || !isOverbreakActive || pendingStatusIdHandledRef.current === urlPendingId) return;
    pendingStatusIdHandledRef.current = urlPendingId;
    setSearchParams((p) => { p.delete('pendingStatusId'); return p; }, { replace: true });
    handleSelectStatus(urlPendingId);
  }, [isOverbreakActive, searchParams, setSearchParams, handleSelectStatus]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Track your attendance and status</p>
      </div>

      {/* Current Status Card */}
      <StatusCard currentRecord={currentRecord} onBreakExpired={handleBreakExpired} />

      {/* Status Picker */}
      <StatusPicker
        statuses={statuses}
        currentStatusId={currentStatusId}
        isLoading={changeStatusMutation.isPending}
        cooldownRemaining={cooldownRemaining}
        onSelect={handleSelectStatus}
        onLogout={handleLogout}
      />

      {/* Today's History */}
      <div data-testid="today-history" className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">Today's History</h2>
        </div>
        <div className="overflow-x-auto">
          {isTodayLoading ? (
            <div className="flex h-24 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : todayRecords.length === 0 ? (
            <div data-testid="today-history-empty" className="flex h-24 items-center justify-center">
              <p className="text-sm text-muted-foreground">No records for today</p>
            </div>
          ) : (
            <table data-testid="today-history-table" className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Start</th>
                  <th className="px-6 py-3 font-medium">End</th>
                  <th className="px-6 py-3 font-medium">Duration</th>
                  <th className="px-6 py-3 font-medium">Overbreak</th>
                  <th className="px-6 py-3 font-medium">Notes</th>
                  {isSuperAdmin && <th className="px-6 py-3 font-medium">Debug Info</th>}
                  <th className="px-6 py-3 font-medium">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {todayRecords.map((record) => {
                  return <tr key={record.id} className="hover:bg-muted/30">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: record.status.colorHex ?? '#6b7280' }}
                        />
                        {record.status.displayName ?? record.status.name}
                      </div>
                    </td>
                    <td className="px-6 py-3 font-mono">
                      {format(new Date(record.startTime), 'HH:mm')}
                    </td>
                    <td className="px-6 py-3 font-mono">
                      {record.endTime
                        ? format(new Date(record.endTime), 'HH:mm')
                        : record.isSuperseded
                          ? <span className="text-amber-600 font-medium">Superseded</span>
                          : <span className="text-primary font-medium">Ongoing</span>}
                    </td>
                    <td className="px-6 py-3 font-mono">
                      {record.endTime
                        ? formatDuration(record.durationSeconds)
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-6 py-3">
                      <OverbreakBadge
                        overbreakSeconds={calcOverbreakSeconds(
                          record.durationSeconds,
                          record.status.isBreak,
                          record.status.maxDurationSeconds,
                        )}
                      />
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      {record.notes ?? '—'}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                        {record.debugInfo ?? '—'}
                      </td>
                    )}
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                      {format(new Date(record.logCreatedAt), 'HH:mm')}
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <OverBreakModal
        isOpen={isOverBreakOpen || isLogoutOverbreakOpen}
        breakContext={isLogoutOverbreakOpen ? overbreakBreakContext : breakContext}
        onConfirm={isLogoutOverbreakOpen ? handleLogoutOverbreakConfirm : handleOverBreakConfirm}
        onCancel={isLogoutOverbreakOpen ? cancelLogoutOverbreak : handleOverBreakCancel}
      />
      <MoodLogoutModal isOpen={isMoodLogoutOpen} onClose={closeMoodLogout} onConfirm={handleMoodLogoutConfirm} />
    </div>
  );
}
