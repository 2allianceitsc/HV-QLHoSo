import { useEffect, useRef, useState } from 'react';
import { differenceInSeconds } from 'date-fns';

interface BreakCountdownProps {
  startTime: string;
  maxDurationSeconds: number;
  onExpired: () => void;
  /**
   * Client-side UTC timestamp recorded when the break status was started
   * (captured immediately before the POST /api/attendance call on the same machine).
   * When present, elapsed time is computed against this value instead of `startTime`
   * (server UTC), keeping the countdown on the same clock as Date.now() and
   * eliminating any client-vs-server clock skew from the display.
   */
  clientStartTime?: string | null;
}

export function BreakCountdown({ startTime, maxDurationSeconds, onExpired, clientStartTime }: BreakCountdownProps) {
  const [remaining, setRemaining] = useState(maxDurationSeconds);
  const [overtimeSeconds, setOvertimeSeconds] = useState(0);
  const expiredRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    expiredRef.current = false;
    setOvertimeSeconds(0);

    const tick = () => {
      // Prefer clientStartTime (same machine as Date.now()) to avoid cross-machine skew.
      // Fall back to server startTime for rows where clientStartTime is unavailable.
      const refTime = clientStartTime ?? startTime;
      const elapsed = Math.max(0, differenceInSeconds(new Date(), new Date(refTime)));
      const rem = Math.max(0, maxDurationSeconds - elapsed);
      setRemaining(rem);

      if (rem === 0) {
        setOvertimeSeconds(Math.max(0, elapsed - maxDurationSeconds));
        if (!expiredRef.current) {
          expiredRef.current = true;
          onExpired();
          // Keep interval running so the overtime counter keeps ticking
        }
      }
    };

    tick();
    intervalRef.current = setInterval(tick, 500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startTime, clientStartTime, maxDurationSeconds, onExpired]);

  // Overtime mode: break has expired, show elapsed-over counter
  if (remaining === 0) {
    const overMin = Math.floor(overtimeSeconds / 60);
    const overSec = overtimeSeconds % 60;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-red-500">Break Time Exceeded</span>
          <span className="animate-pulse font-mono font-bold tabular-nums text-red-500">
            +{String(overMin).padStart(2, '0')}:{String(overSec).padStart(2, '0')}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-full animate-pulse rounded-full bg-red-500" />
        </div>
        <p className="text-xs text-red-400">Select your next status to continue</p>
      </div>
    );
  }

  const pct = maxDurationSeconds > 0 ? (remaining / maxDurationSeconds) * 100 : 0;
  const isWarning = pct < 20;

  const minutes = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const label = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Break remaining</span>
        <span
          className={`font-mono font-bold tabular-nums ${
            isWarning ? 'animate-pulse text-red-500' : 'text-foreground'
          }`}
        >
          {label}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isWarning ? 'animate-pulse bg-red-500' : 'bg-primary'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
