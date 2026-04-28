-- IC-07 refinement: group by shift (ShiftEndTime::DATE) instead of calendar day
-- Rule: each staff member can receive at most 1 auto-logout per shift.
-- ShiftEndTime is stored on the TT row at the time the auto-logout runs, so
-- grouping by (StaffId, ShiftEndTime::DATE) correctly identifies the shift.
-- Fallback to DATE(StartTime) when ShiftEndTime is NULL.

UPDATE integrity_check_registry
SET
  description = 'Each staff member should have at most 1 auto-logout TT row per shift. ShiftEndTime stored on the row identifies the shift; DATE(StartTime) is used as fallback when ShiftEndTime is NULL. >1 row per shift indicates a duplicate cron execution (multiple Railway instances on the same DB) or IC-02 data corruption (multiple open rows per staff). Compare cron_run_id values in the detail view to distinguish the two causes.',
  check_name  = 'Multiple auto-logout rows per staff per shift'
WHERE check_id = 'tt_multiple_auto_logout_per_day';

-- ── Redefine count function ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_ic_tt_multiple_auto_logout_per_day_count()
RETURNS BIGINT LANGUAGE SQL STABLE AS $$
  SELECT COUNT(*) FROM (
    SELECT "StaffId"
    FROM   "TimeTracking"
    WHERE  "UserAgent"  LIKE 'system-auto-logout:%'
      AND  "IsDeleted"  = false
      AND  "StartTime" >= NOW() - INTERVAL '30 days'
    GROUP  BY "StaffId", COALESCE("ShiftEndTime"::DATE, DATE("StartTime"))
    HAVING COUNT(*) > 1
  ) sub;
$$;

-- ── Redefine detail function ──────────────────────────────────────────────────
-- Must DROP first because the return type signature changes (logout_date → shift_date).

DROP FUNCTION IF EXISTS fn_ic_tt_multiple_auto_logout_per_day_detail(INT);

CREATE OR REPLACE FUNCTION fn_ic_tt_multiple_auto_logout_per_day_detail(p_limit INT DEFAULT 100)
RETURNS TABLE (
  record_id    TEXT,
  staff_id     TEXT,
  employee_id  TEXT,
  staff_name   TEXT,
  shift_date   DATE,
  start_time   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ,
  cron_run_id  TEXT,
  notes        TEXT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    tt."id"::TEXT,
    tt."StaffId"::TEXT,
    s."EmployeeId",
    CONCAT(s."FirstName", ' ', s."Surname"),
    COALESCE(tt."ShiftEndTime"::DATE, DATE(tt."StartTime")),
    tt."StartTime",
    tt."Log_CreatedAt",
    SPLIT_PART(tt."UserAgent", ':', 2),
    tt."Notes"
  FROM "TimeTracking" tt
  JOIN "Staff" s ON s."id" = tt."StaffId"
  WHERE tt."UserAgent" LIKE 'system-auto-logout:%'
    AND tt."IsDeleted"  = false
    AND tt."StaffId" IN (
      SELECT "StaffId"
      FROM   "TimeTracking"
      WHERE  "UserAgent"  LIKE 'system-auto-logout:%'
        AND  "IsDeleted"  = false
        AND  "StartTime" >= NOW() - INTERVAL '30 days'
      GROUP  BY "StaffId", COALESCE("ShiftEndTime"::DATE, DATE("StartTime"))
      HAVING COUNT(*) > 1
    )
  ORDER BY tt."StaffId", tt."StartTime" DESC
  LIMIT p_limit;
$$;
