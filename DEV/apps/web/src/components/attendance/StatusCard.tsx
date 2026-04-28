import { useEffect, useRef, useState } from 'react';
import type { ITimeTracking } from '@/api/attendance.api';
import { BreakCountdown } from './BreakCountdown';
import { AppIcon } from '@/components/AppIcon';
import { Circle } from 'lucide-react';
import { formatElapsedHMS } from '@/lib/dateFormat';

interface StatusCardProps {
  currentRecord: ITimeTracking | null;
  onBreakExpired: () => void;
}

export function StatusCard({ currentRecord, onBreakExpired }: StatusCardProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!currentRecord?.startTime) {
      setElapsed(0);
      return;
    }
    const refMs = new Date(currentRecord.clientStartTime ?? currentRecord.startTime).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - refMs) / 1000)));
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currentRecord?.startTime, currentRecord?.clientStartTime]);

  if (!currentRecord) {
    return (
      <div data-testid="status-card-empty" className="rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-muted-foreground text-sm">No active status</p>
      </div>
    );
  }

  const status = currentRecord.status;
  const isBreak = status.isBreak && (status.maxDurationSeconds ?? 0) > 0;
  const colorStyle = status.colorHex
    ? { borderLeftColor: status.colorHex, borderLeftWidth: 4 }
    : {};

  return (
    <div data-testid="status-card" className="rounded-xl border bg-card p-6 shadow-sm" style={colorStyle}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ backgroundColor: status.colorHex ?? '#6b7280' }}
          >
            <AppIcon
              iconId={status.iconId}
              alt={status.displayName ?? status.name}
              className="h-5 w-5"
              fallback={<Circle className="h-4.5 w-4.5" />}
            />
          </div>
          <div>
            <p className="font-semibold text-lg leading-tight">
              {status.displayName ?? status.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {new Date(currentRecord.startTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        {!isBreak && (
          <div className="text-right">
            <p data-testid="status-timer" className="font-mono text-2xl font-bold tabular-nums">
              {formatElapsedHMS(elapsed)}
            </p>
            <p className="text-xs text-muted-foreground">elapsed</p>
          </div>
        )}
      </div>

      {isBreak && status.maxDurationSeconds && (
        <div className="mt-4">
          <BreakCountdown
            startTime={currentRecord.startTime}
            clientStartTime={currentRecord.clientStartTime}
            maxDurationSeconds={status.maxDurationSeconds}
            onExpired={onBreakExpired}
          />
        </div>
      )}
    </div>
  );
}
