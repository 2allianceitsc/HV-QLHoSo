export const STATUS_PICKER_MIN_CARD_WIDTH_REM = 8;

/**
 * Calculates the displayed cooldown value (whole seconds, ceiling).
 * Caps at minInterval to guard against server-clock skew where startMs
 * is slightly in the future relative to nowMs, which would otherwise
 * make Math.ceil(remaining) exceed minInterval (e.g. show "4" instead of "3").
 */
export function calcCooldownRemaining(startMs: number, nowMs: number, minInterval: number): number {
  const elapsed = (nowMs - startMs) / 1000;
  const remaining = Math.max(0, minInterval - elapsed);
  return Math.min(minInterval, Math.ceil(remaining));
}

export function formatStatusMaxDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return null;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const parts = [
    hours > 0 ? `${hours}h` : null,
    minutes > 0 ? `${minutes}m` : null,
    remainingSeconds > 0 ? `${remainingSeconds}s` : null,
  ].filter(Boolean);

  return parts.join(' ');
}