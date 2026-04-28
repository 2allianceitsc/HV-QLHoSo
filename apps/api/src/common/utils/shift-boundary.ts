/**
 * Resolves the UTC timestamp at which a staff member's shift boundary (latestEndShiftTime)
 * falls, relative to the calendar date of `reference` in their timezone.
 *
 * - Returns null if latestEndShiftTime is not set (staff has no auto-logout config).
 * - `dayOffset = 1` handles night shifts that end on the next calendar day.
 */
export function resolveShiftBoundary(
  reference: Date,
  latestEndShiftTime?: string | null,
  timezone?: string | null,
  dayOffset = 0,
): Date | null {
  if (!latestEndShiftTime) return null;
  const [hours, minutes] = latestEndShiftTime.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  if (timezone) {
    try {
      const localDateStr = reference.toLocaleDateString('en-CA', { timeZone: timezone }); // "YYYY-MM-DD"
      const fakeUtcIso = `${localDateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00Z`;
      const fakeUtc = new Date(fakeUtcIso);
      fakeUtc.setUTCDate(fakeUtc.getUTCDate() + dayOffset);

      const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      });
      const parts = Object.fromEntries(fmt.formatToParts(fakeUtc).map((p) => [p.type, p.value]));
      const localMs = Date.UTC(
        parseInt(parts['year']),
        parseInt(parts['month']) - 1,
        parseInt(parts['day']),
        parseInt(parts['hour'] === '24' ? '0' : parts['hour']),
        parseInt(parts['minute']),
        parseInt(parts['second']),
      );
      const offsetMs = localMs - fakeUtc.getTime();
      return new Date(fakeUtc.getTime() - offsetMs);
    } catch {
      // Invalid IANA zone — fall through to legacy behaviour
    }
  }

  // Legacy fallback: treat HH:mm as server-local time (UTC on Railway)
  const shiftBoundary = new Date(reference);
  shiftBoundary.setUTCDate(shiftBoundary.getUTCDate() + dayOffset);
  shiftBoundary.setUTCHours(hours, minutes, 0, 0);
  return shiftBoundary;
}

/**
 * Returns true if an open TT session is "stale" — meaning it belongs to a previous shift
 * cycle and should be closed automatically when a new login is detected.
 *
 * Two cases:
 *  1. Staff has latestEndShiftTime: stale when the shift boundary (accounting for night-shift
 *     dayOffset) computed from the session's startTime has already passed.
 *  2. Staff has no latestEndShiftTime (e.g. admin/super-admin): stale when the session
 *     started on a previous calendar day in the staff's timezone.
 */
export function isStaleSession(
  sessionStartTime: Date,
  now: Date,
  latestEndShiftTime?: string | null,
  timezone?: string | null,
  shiftEndDayOffset = 0,
): boolean {
  const boundary = resolveShiftBoundary(sessionStartTime, latestEndShiftTime, timezone, shiftEndDayOffset);

  if (boundary !== null) {
    // Has shift config: stale when the computed boundary has passed.
    return now >= boundary;
  }

  // No shift config: stale when the session is from a previous calendar day in the user's timezone.
  const tz = timezone ?? 'UTC';
  const sessionDate = sessionStartTime.toLocaleDateString('en-CA', { timeZone: tz });
  const todayDate = now.toLocaleDateString('en-CA', { timeZone: tz });
  return sessionDate < todayDate;
}
