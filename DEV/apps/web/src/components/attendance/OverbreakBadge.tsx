import { AlarmClock } from 'lucide-react';

/**
 * Returns how many seconds over the break limit, or null if not overbreak.
 * isBreak=true + maxDurationSeconds>0 + durationSeconds>max → overbreak
 */
export function calcOverbreakSeconds(
  durationSeconds: number | null | undefined,
  isBreak: boolean | null | undefined,
  maxDurationSeconds: number | null | undefined,
): number | null {
  if (!isBreak) return null;
  if (!maxDurationSeconds || maxDurationSeconds <= 0) return null;
  if (!durationSeconds || durationSeconds <= 0) return null;
  const over = durationSeconds - maxDurationSeconds;
  return over > 0 ? over : null;
}

/** Format seconds as "+2m 30s" or "+1h 5m" */
export function formatOverbreak(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `+${h}h ${m}m`;
  if (m > 0) return `+${m}m ${s > 0 ? `${s}s` : ''}`.trim();
  return `+${s}s`;
}

interface OverbreakBadgeProps {
  overbreakSeconds: number | null | undefined;
}

/**
 * Compact badge showing how much over the break limit.
 * Shows nothing when there is no overbreak.
 */
export function OverbreakBadge({ overbreakSeconds }: OverbreakBadgeProps) {
  if (!overbreakSeconds || overbreakSeconds <= 0) return null;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[11px] font-semibold text-destructive"
      title={`${formatOverbreak(overbreakSeconds)} over break limit`}
    >
      <AlarmClock className="h-3 w-3" />
      {formatOverbreak(overbreakSeconds)}
    </span>
  );
}
