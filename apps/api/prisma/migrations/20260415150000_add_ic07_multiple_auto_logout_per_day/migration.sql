-- IC-07: Multiple auto-logout rows per staff per UTC day
-- Detects duplicate cron executions or data corruption that caused >1 auto-logout
-- row for the same staff on the same calendar day.
-- Auto-logout rows are identified by UserAgent LIKE 'system-auto-logout:%'
-- (includes cronRunId suffix added in the same release).

-- ── Registry entry ────────────────────────────────────────────────────────────

INSERT INTO integrity_check_registry (check_id, check_name, category, severity, description, order_no)
VALUES (
  'tt_multiple_auto_logout_per_day',
  'Multiple auto-logout rows per staff per day',
  'TimeTracking',
  'error',
  'Each staff should have at most 1 auto-logout TT row per UTC day. >1 indicates duplicate cron execution (multiple Railway instances on same DB) or data corruption (multiple open rows per staff). Inspect the cron_run_id column in the detail view to distinguish the two causes.',
  70
);

-- ── Count function ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_ic_tt_multiple_auto_logout_per_day_count()
RETURNS BIGINT LANGUAGE SQL STABLE AS $$
  SELECT COUNT(*) FROM (
    SELECT "StaffId"
    FROM   "TimeTracking"
    WHERE  "UserAgent" LIKE 'system-auto-logout:%'
      AND  "IsDeleted"  = false
      AND  "StartTime" >= NOW() - INTERVAL '30 days'
    GROUP  BY "StaffId", DATE("StartTime")
    HAVING COUNT(*) > 1
  ) sub;
$$;

-- ── Detail function ───────────────────────────────────────────────────────────
-- Returns one row per violating auto-logout TT record.
-- cron_run_id: extracted from UserAgent ('system-auto-logout:{uuid}').
--   - Same cron_run_id on two rows → 1 cron tick processed 2 open records (IC-02 root cause).
--   - Different cron_run_ids → 2 separate cron instances wrote to the same DB concurrently.

CREATE OR REPLACE FUNCTION fn_ic_tt_multiple_auto_logout_per_day_detail(p_limit INT DEFAULT 100)
RETURNS TABLE (
  record_id    TEXT,
  staff_id     TEXT,
  employee_id  TEXT,
  staff_name   TEXT,
  logout_date  DATE,
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
    DATE(tt."StartTime"),
    tt."StartTime",
    tt."Log_CreatedAt",
    -- Extract everything after the first colon: 'system-auto-logout:{uuid}' → '{uuid}'
    SPLIT_PART(tt."UserAgent", ':', 2),
    tt."Notes"
  FROM "TimeTracking" tt
  JOIN "Staff" s ON s."id" = tt."StaffId"
  WHERE tt."UserAgent" LIKE 'system-auto-logout:%'
    AND tt."IsDeleted"  = false
    AND tt."StaffId" IN (
      SELECT "StaffId"
      FROM   "TimeTracking"
      WHERE  "UserAgent" LIKE 'system-auto-logout:%'
        AND  "IsDeleted"  = false
        AND  "StartTime" >= NOW() - INTERVAL '30 days'
      GROUP  BY "StaffId", DATE("StartTime")
      HAVING COUNT(*) > 1
    )
  ORDER BY tt."StaffId", tt."StartTime" DESC
  LIMIT p_limit;
$$;
