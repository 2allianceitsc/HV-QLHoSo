import { useEffect, useRef, useState, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useStatuses, useChangeStatus, useTodayAttendance, useAttendanceConfig } from '@/hooks/useAttendance';
import { calcCooldownRemaining } from '@/components/attendance/attendance-ui';
import { useProfile, useUpdateWidgetSettings } from '@/hooks/useProfile';
import { safeArray } from '@/lib/safeArray';
import { useToast } from '@/hooks/use-toast';
import { AppIcon } from '@/components/AppIcon';
import { getE205RetryAfter, getApiErrorMessage } from '@/lib/apiError';
import type { IStatusDefinition, ITimeTracking } from '@/api/attendance.api';
import type { IWidgetPosition } from '@/api/profile.api';
// ── Helpers ───────────────────────────────────────────────────────────────────

// Widget elapsed display rule (bubble is 48px — space is tight):
//   < 1 hour  →  MM:SS   font-[10px]   (5 chars fit comfortably)
//   ≥ 1 hour  →  HH:MM:SS  font-[8px]  (8 chars, smaller to fit)
// Calculation matches StatusCard: clientStartTime ?? startTime, 1 s interval.
function formatElapsedWidget(seconds: number): { label: string; fontSize: string } {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return {
      label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      fontSize: 'text-[8px]',
    };
  }
  return {
    label: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
    fontSize: 'text-[10px]',
  };
}

function formatBreakTime(elapsed: number, max: number): string {
  if (elapsed > max) {
    const over = elapsed - max;
    return `+${String(Math.floor(over / 60)).padStart(2, '0')}:${String(over % 60).padStart(2, '0')}`;
  }
  const rem = max - elapsed;
  return `${String(Math.floor(rem / 60)).padStart(2, '0')}:${String(rem % 60).padStart(2, '0')}`;
}

function getOpenRecord(records: ITimeTracking[]): ITimeTracking | null {
  return records.find((r) => !r.endTime && !r.isSuperseded) ?? null;
}

// ── Break countdown ───────────────────────────────────────────────────────────

function useBreakCountdown(record: ITimeTracking | null) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!record) {
      setElapsed(0);
      return;
    }
    // Always track elapsed from record start — used for both break countdown and non-break elapsed.
    // Prefer clientStartTime (same machine as Date.now()) to avoid cross-machine skew.
    const refMs = new Date(record.clientStartTime ?? record.startTime).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - refMs) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [record?.id, record?.startTime, record?.clientStartTime]);

  const max = record?.status.maxDurationSeconds ?? 0;
  // Require max > 0: unlimited breaks (no maxDurationSeconds) behave like non-break for display.
  // Mirrors StatusCard's isBreak check to avoid showing +MM:SS on breaks with no time limit.
  const isBreak = !!record?.status.isBreak && max > 0;
  const isExceeded = isBreak && elapsed > max;

  return { elapsed, isExceeded, isBreak, max };
}

// ── Drag + snap ───────────────────────────────────────────────────────────────

const EDGE_MARGIN = 16;
const DEFAULT_POS: IWidgetPosition = { side: 'right', yOffset: 120 };

function posToStyle(pos: IWidgetPosition): React.CSSProperties {
  return pos.side === 'right'
    ? { right: EDGE_MARGIN, top: pos.yOffset }
    : { left: EDGE_MARGIN, top: pos.yOffset };
}

// ── Status item ───────────────────────────────────────────────────────────────

function StatusItem({
  status,
  isCurrent,
  disabled,
  onClick,
}: {
  status: IStatusDefinition;
  isCurrent: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      data-testid={`widget-status-${status.id}`}
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left transition-colors rounded-md
        ${isCurrent ? 'bg-primary/10 font-semibold text-foreground' : 'hover:bg-accent text-foreground'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: status.colorHex ?? '#6b7280' }}
      />
      <span className="truncate">{status.displayName ?? status.name}</span>
      {isCurrent && <span className="ml-auto text-[10px] text-muted-foreground">current</span>}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface FloatingWidgetProps {
  startLogout: () => void;
}

export function FloatingWidget({ startLogout }: FloatingWidgetProps) {
  const { user, isAuthenticated } = useAuthStore();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: _statuses } = useStatuses();
  const { data: _todayRecords } = useTodayAttendance();
  const { data: attendanceConfig } = useAttendanceConfig();
  const changeStatusMutation = useChangeStatus();
  const updateWidgetMutation = useUpdateWidgetSettings();
  const navigate = useNavigate();
  const { toast } = useToast();

  const statuses = safeArray<IStatusDefinition>(_statuses).filter(
    (s) => !s.isLoginStatus && !s.isLogoutStatus,
  );
  const todayRecords = safeArray<ITimeTracking>(_todayRecords);
  const currentRecord = getOpenRecord(todayRecords);
  const currentStatusId = currentRecord?.statusId ?? null;

  const { isBreak, isExceeded, elapsed, max } = useBreakCountdown(currentRecord);

  const minInterval = attendanceConfig?.minStatusChangeIntervalSeconds ?? 3;
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  // Drives the countdown when no record-based interval is running (E205 recovery).
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Clear any manual timer — record-based one takes over when a new record arrives.
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    if (!currentRecord?.startTime || minInterval <= 0) return;
    // Prefer clientStartTime (same machine as Date.now()) to avoid cross-machine skew.
    // Falls back to server startTime for rows where clientStartTime is unavailable.
    const refMs = new Date(currentRecord.clientStartTime ?? currentRecord.startTime).getTime();
    const elapsed = (Date.now() - refMs) / 1000;
    if (elapsed >= minInterval) { setCooldownRemaining(0); return; }
    const tick = () => {
      const rem = calcCooldownRemaining(refMs, Date.now(), minInterval);
      setCooldownRemaining(rem);
      if (rem <= 0) clearInterval(timerId);
    };
    const timerId = setInterval(tick, 200);
    tick();
    return () => clearInterval(timerId);
  }, [currentRecord?.startTime, currentRecord?.clientStartTime, minInterval]);

  // Start a manual countdown for `seconds`. Used for E205 recovery so the button
  // re-enables after retryAfterSeconds rather than staying blocked.
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

  useEffect(() => {
    return () => { if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current); };
  }, []);

  // Position state — hydrated from profile on load
  const [pos, setPos] = useState<IWidgetPosition>(DEFAULT_POS);
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Hydrate position from profile
  useEffect(() => {
    if (profile?.floatingWidgetPosition) {
      setPos(profile.floatingWidgetPosition);
    }
  }, [profile?.floatingWidgetPosition?.side, profile?.floatingWidgetPosition?.yOffset]);

  // ── Drag ──────────────────────────────────────────────────────────────────
  const dragState = useRef<{ startX: number; startY: number; origTop: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!widgetRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = widgetRef.current.getBoundingClientRect();
    dragState.current = { startX: e.clientX, startY: e.clientY, origTop: rect.top };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current || !widgetRef.current) return;
    const dy = e.clientY - dragState.current.startY;
    const clampedOrigTop = Math.max(60, Math.min(dragState.current.origTop, window.innerHeight - 80));
    const rawTarget = clampedOrigTop + dy;
    const clampedDy = Math.max(60 - clampedOrigTop, Math.min(rawTarget, window.innerHeight - 80) - clampedOrigTop);
    // Use transform so React re-renders don't override top/right/left during drag
    widgetRef.current.style.transform = `translateY(${clampedDy}px)`;
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current || !widgetRef.current) return;
    const dx = Math.abs(e.clientX - dragState.current.startX);
    const dy = Math.abs(e.clientY - dragState.current.startY);
    // If barely moved, treat as click — keep panel open (don't toggle)
    if (dx < 4 && dy < 4) {
      dragState.current = null;
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      return;
    }
    setIsHoverOpen(false);
    const rect = widgetRef.current.getBoundingClientRect();
    const newSide: 'left' | 'right' = e.clientX < window.innerWidth / 2 ? 'left' : 'right';
    const newYOffset = Math.max(60, Math.min(rect.top, window.innerHeight - 80));
    const newPos: IWidgetPosition = { side: newSide, yOffset: newYOffset };
    dragState.current = null;
    // flushSync: clear transform and commit new pos in the same synchronous React flush
    // so no intermediate re-render (e.g. from React Query polling) can paint the old position
    widgetRef.current.style.transform = '';
    flushSync(() => setPos(newPos));
    // Debounced save to DB
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateWidgetMutation.mutate({ floatingWidgetPosition: newPos });
    }, 500);
  }, [updateWidgetMutation]);

  // ── Hover panel ───────────────────────────────────────────────────────────
  const openPanel = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setIsHoverOpen(true);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimerRef.current = setTimeout(() => setIsHoverOpen(false), 300);
  }, []);

  // ── Status select ─────────────────────────────────────────────────────────
  const handleSelectStatus = useCallback((statusId: string) => {
    if (isExceeded) {
      // Delegate to dashboard's overbreak flow via URL param (reuses M03 modal logic)
      navigate(`/?pendingStatusId=${statusId}`);
      setIsHoverOpen(false);
      return;
    }
    changeStatusMutation.mutate(
      { statusId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      {
        onSuccess: () => { setIsHoverOpen(false); },
        onError: (err) => {
          const retryAfter = getE205RetryAfter(err);
          if (retryAfter !== null) {
            // Server says cooldown not elapsed yet (clock skew edge case).
            // Restart countdown from server's remaining seconds so user knows when to retry.
            startManualCooldown(retryAfter);
            toast({ variant: 'destructive', title: 'Please wait', description: `Change status again in ${retryAfter}s.` });
            return;
          }
          toast({ variant: 'destructive', title: 'Status change failed', description: getApiErrorMessage(err) });
        },
      },
    );
  }, [isExceeded, navigate, changeStatusMutation, toast, startManualCooldown]);

  const handleLogoutClick = useCallback(() => {
    setIsHoverOpen(false);
    startLogout();
  }, [startLogout]);

  // ── Guard — don't render ──────────────────────────────────────────────────
  const isEmployee = (user?.roles ?? []).includes('EMPLOYEE');
  const widgetEnabled = profile?.showFloatingWidget ?? true;
  // Wait for profile to load before rendering (prevents flash at default position on reload)
  if (!isEmployee || !widgetEnabled || profileLoading) return null;

  // ── Auto-logout state — user has been kicked ──────────────────────────────
  const isLoggedOut = !isAuthenticated;

  // ── Current status display ────────────────────────────────────────────────
  const currentStatus = statuses.find((s) => s.id === currentStatusId)
    ?? todayRecords.find((r) => r.id === currentRecord?.id)?.status;
  const statusColor = currentStatus?.colorHex ?? '#6b7280';
  const statusLabel = currentStatus
    ? (currentStatus.displayName ?? currentStatus.name)
    : (isLoggedOut ? 'Logged out' : '—');

  // ── Panel position — flush next to bubble (no gap so mouse can move between them)
  const BUBBLE_SIZE = 48;
  // Clamp panel top so it never overflows below viewport
  const PANEL_HEIGHT_ESTIMATE = 340; // max-h-72 (288) + logout row (~52)
  const panelTop = Math.max(8, Math.min(pos.yOffset, window.innerHeight - PANEL_HEIGHT_ESTIMATE - 8));
  const panelStyle: React.CSSProperties =
    pos.side === 'right'
      ? { right: EDGE_MARGIN + BUBBLE_SIZE, top: panelTop }
      : { left: EDGE_MARGIN + BUBBLE_SIZE, top: panelTop };

  return createPortal(
    <>
      {/* Widget bubble */}
      <div
        ref={widgetRef}
        data-testid="floating-widget-bubble"
        className="fixed z-40 hidden md:flex flex-col items-center select-none touch-none"
        style={posToStyle(pos)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onMouseEnter={openPanel}
        onMouseLeave={scheduleClose}
      >
        <div
          data-testid="widget-bubble-circle"
          className={`relative h-12 w-12 rounded-full shadow-lg flex items-center justify-center cursor-pointer
            transition-transform hover:scale-105 active:scale-95
            ${isExceeded ? 'animate-pulse ring-2 ring-red-500' : ''}`}
          style={{ backgroundColor: isLoggedOut ? '#374151' : statusColor }}
          title={statusLabel}
        >
          {/* Break countdown */}
          {!isLoggedOut && isBreak && (
            <span
              className={`text-[10px] font-bold leading-none text-white drop-shadow ${isExceeded ? 'text-red-200' : ''}`}
            >
              {formatBreakTime(elapsed, max)}
            </span>
          )}
          {/* Non-break elapsed — see formatElapsedWidget for font/format rules */}
          {!isLoggedOut && !isBreak && currentRecord && (() => {
            const { label, fontSize } = formatElapsedWidget(elapsed);
            return (
              <span className={`${fontSize} font-bold leading-none text-white drop-shadow tabular-nums`}>
                {label}
              </span>
            );
          })()}
          {/* Icon: logged out or no active record */}
          {(isLoggedOut || (!isBreak && !currentRecord)) && (
            isLoggedOut
              ? <span className="text-white text-[18px] leading-none">⏻</span>
              : <AppIcon
                  iconId={currentStatus?.iconId}
                  className="h-5 w-5 text-white"
                  fallback={<span className="text-white text-[18px] leading-none">●</span>}
                />
          )}
        </div>
      </div>

      {/* Hover panel */}
      {isHoverOpen && !isLoggedOut && (
        <div
          ref={panelRef}
          data-testid="widget-picker-panel"
          className="fixed z-40 hidden md:block w-52 bg-card border border-border rounded-xl shadow-xl py-1.5 animate-scale-in"
          style={panelStyle}
          onMouseEnter={openPanel}
          onMouseLeave={scheduleClose}
        >
          <div className="max-h-72 overflow-y-auto px-1.5 py-1">
            {statuses.map((s) => (
              <StatusItem
                key={s.id}
                status={s}
                isCurrent={s.id === currentStatusId}
                disabled={s.id === currentStatusId || changeStatusMutation.isPending || cooldownRemaining > 0}
                onClick={() => handleSelectStatus(s.id)}
              />
            ))}
          </div>
          <div className="border-t border-border mt-1 pt-1 px-1.5">
            <button
              data-testid="widget-logout-btn"
              onClick={handleLogoutClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-destructive hover:bg-destructive/10 transition-colors rounded-md cursor-pointer"
            >
              <LogOut size={13} />
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Auto-logout state — click widget to go to login */}
      {isLoggedOut && (
        <div
          className="fixed z-40 hidden md:flex flex-col items-center select-none cursor-pointer"
          style={posToStyle(pos)}
          onClick={() => navigate('/login')}
          title="You have been automatically logged out. Click to log in."
        >
          <div className="h-12 w-12 rounded-full shadow-lg flex items-center justify-center bg-gray-700 text-white text-[18px]">
            ⏻
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
