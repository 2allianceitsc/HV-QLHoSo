-- ──────────────────────────────────────────────────────────────────────────────
-- Data Integrity Checks
-- Registry table + master function + 6 checks (12 SQL functions)
-- ──────────────────────────────────────────────────────────────────────────────

-- Registry table
CREATE TABLE integrity_check_registry (
  check_id    TEXT        PRIMARY KEY,
  check_name  TEXT        NOT NULL,
  category    TEXT        NOT NULL,
  severity    TEXT        NOT NULL DEFAULT 'error',
  description TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  order_no    INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial checks
INSERT INTO integrity_check_registry (check_id, check_name, category, severity, description, order_no) VALUES
  ('tt_superseded_with_endtime',  'Superseded rows with endTime set',       'TimeTracking', 'error',   'isSuperseded=true implies endTime must be NULL — the row is an audit marker, not a closeable session.', 10),
  ('tt_multiple_open_sessions',   'Multiple open sessions per staff',       'TimeTracking', 'error',   'At most one row per staff may have isSuperseded=false AND endTime=NULL at any time.',                    20),
  ('tt_duration_mismatch',        'Duration mismatch (stored ≠ computed)',  'TimeTracking', 'error',   'durationSeconds must equal EXTRACT(EPOCH FROM endTime - startTime) within 1 second tolerance.',        30),
  ('tt_negative_duration',        'endTime before startTime',               'TimeTracking', 'error',   'endTime < startTime is physically impossible.',                                                          40),
  ('tt_open_logout_row',          'Open logout-status rows',                'TimeTracking', 'error',   'Rows whose status has isLogoutStatus=true must always be closed immediately (endTime set).',            50),
  ('tt_stale_open_session',       'Stale open session (> 36 hours)',        'TimeTracking', 'warning', 'A non-superseded open session older than 36h likely indicates a missed logout.',                        60);

-- ──────────────────────────────────────────────────────────────────────────────
-- Master function — dynamically dispatches to fn_ic_{check_id}_count()
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_ic_run_all()
RETURNS TABLE (
  check_id        TEXT,
  check_name      TEXT,
  category        TEXT,
  severity        TEXT,
  description     TEXT,
  violation_count BIGINT
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  rec     RECORD;
  v_count BIGINT;
BEGIN
  FOR rec IN
    SELECT * FROM integrity_check_registry
    WHERE is_active = true
    ORDER BY order_no
  LOOP
    EXECUTE format('SELECT fn_ic_%I_count()', rec.check_id) INTO v_count;
    RETURN QUERY SELECT
      rec.check_id,
      rec.check_name,
      rec.category,
      rec.severity,
      rec.description,
      v_count;
  END LOOP;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- IC-01: tt_superseded_with_endtime
-- Rule: isSuperseded=true → endTime MUST be NULL
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_ic_tt_superseded_with_endtime_count()
RETURNS BIGINT LANGUAGE SQL STABLE AS $$
  SELECT COUNT(*)::BIGINT
  FROM   "TimeTracking"
  WHERE  "IsSuperseded" = true
    AND  "EndTime"      IS NOT NULL
    AND  "IsDeleted"    = false;
$$;

CREATE OR REPLACE FUNCTION fn_ic_tt_superseded_with_endtime_detail(p_limit INT DEFAULT 100)
RETURNS TABLE (
  record_id    TEXT,
  staff_id     TEXT,
  employee_id  TEXT,
  staff_name   TEXT,
  start_time   TIMESTAMPTZ,
  end_time     TIMESTAMPTZ,
  duration_sec INT,
  is_login     BOOLEAN,
  notes        TEXT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    tt."id"::TEXT,
    tt."StaffId"::TEXT,
    s."EmployeeId",
    CONCAT(s."FirstName", ' ', s."Surname"),
    tt."StartTime",
    tt."EndTime",
    tt."DurationSeconds",
    tt."IsLoginStatus",
    tt."Notes"
  FROM "TimeTracking" tt
  JOIN "Staff" s ON s."id" = tt."StaffId"
  WHERE tt."IsSuperseded" = true
    AND tt."EndTime"      IS NOT NULL
    AND tt."IsDeleted"    = false
  ORDER BY tt."StartTime" DESC
  LIMIT p_limit;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- IC-02: tt_multiple_open_sessions
-- Rule: max 1 row with isSuperseded=false AND endTime=NULL per staff
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_ic_tt_multiple_open_sessions_count()
RETURNS BIGINT LANGUAGE SQL STABLE AS $$
  SELECT COUNT(*)::BIGINT
  FROM "TimeTracking"
  WHERE "IsSuperseded" = false
    AND "EndTime"      IS NULL
    AND "IsDeleted"    = false
    AND "StaffId" IN (
      SELECT "StaffId"
      FROM   "TimeTracking"
      WHERE  "IsSuperseded" = false
        AND  "EndTime"      IS NULL
        AND  "IsDeleted"    = false
      GROUP  BY "StaffId"
      HAVING COUNT(*) > 1
    );
$$;

CREATE OR REPLACE FUNCTION fn_ic_tt_multiple_open_sessions_detail(p_limit INT DEFAULT 100)
RETURNS TABLE (
  record_id   TEXT,
  staff_id    TEXT,
  employee_id TEXT,
  staff_name  TEXT,
  start_time  TIMESTAMPTZ,
  notes       TEXT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    tt."id"::TEXT,
    tt."StaffId"::TEXT,
    s."EmployeeId",
    CONCAT(s."FirstName", ' ', s."Surname"),
    tt."StartTime",
    tt."Notes"
  FROM "TimeTracking" tt
  JOIN "Staff" s ON s."id" = tt."StaffId"
  WHERE tt."IsSuperseded" = false
    AND tt."EndTime"      IS NULL
    AND tt."IsDeleted"    = false
    AND tt."StaffId" IN (
      SELECT "StaffId"
      FROM   "TimeTracking"
      WHERE  "IsSuperseded" = false
        AND  "EndTime"      IS NULL
        AND  "IsDeleted"    = false
      GROUP  BY "StaffId"
      HAVING COUNT(*) > 1
    )
  ORDER BY tt."StaffId", tt."StartTime" DESC
  LIMIT p_limit;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- IC-03: tt_duration_mismatch
-- Rule: ABS(durationSeconds − EPOCH(endTime−startTime)) ≤ 1s
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_ic_tt_duration_mismatch_count()
RETURNS BIGINT LANGUAGE SQL STABLE AS $$
  SELECT COUNT(*)::BIGINT
  FROM "TimeTracking"
  WHERE "EndTime"         IS NOT NULL
    AND "DurationSeconds" IS NOT NULL
    AND ABS("DurationSeconds" - EXTRACT(EPOCH FROM ("EndTime" - "StartTime"))::INT) > 1
    AND "IsDeleted" = false;
$$;

CREATE OR REPLACE FUNCTION fn_ic_tt_duration_mismatch_detail(p_limit INT DEFAULT 100)
RETURNS TABLE (
  record_id         TEXT,
  staff_id          TEXT,
  employee_id       TEXT,
  staff_name        TEXT,
  start_time        TIMESTAMPTZ,
  end_time          TIMESTAMPTZ,
  stored_duration   INT,
  computed_duration INT,
  diff_seconds      INT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    tt."id"::TEXT,
    tt."StaffId"::TEXT,
    s."EmployeeId",
    CONCAT(s."FirstName", ' ', s."Surname"),
    tt."StartTime",
    tt."EndTime",
    tt."DurationSeconds",
    EXTRACT(EPOCH FROM (tt."EndTime" - tt."StartTime"))::INT,
    ABS(tt."DurationSeconds" - EXTRACT(EPOCH FROM (tt."EndTime" - tt."StartTime"))::INT)
  FROM "TimeTracking" tt
  JOIN "Staff" s ON s."id" = tt."StaffId"
  WHERE tt."EndTime"         IS NOT NULL
    AND tt."DurationSeconds" IS NOT NULL
    AND ABS(tt."DurationSeconds" - EXTRACT(EPOCH FROM (tt."EndTime" - tt."StartTime"))::INT) > 1
    AND tt."IsDeleted" = false
  ORDER BY ABS(tt."DurationSeconds" - EXTRACT(EPOCH FROM (tt."EndTime" - tt."StartTime"))::INT) DESC
  LIMIT p_limit;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- IC-04: tt_negative_duration
-- Rule: endTime >= startTime always
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_ic_tt_negative_duration_count()
RETURNS BIGINT LANGUAGE SQL STABLE AS $$
  SELECT COUNT(*)::BIGINT
  FROM "TimeTracking"
  WHERE "EndTime"   IS NOT NULL
    AND "EndTime"   < "StartTime"
    AND "IsDeleted" = false;
$$;

CREATE OR REPLACE FUNCTION fn_ic_tt_negative_duration_detail(p_limit INT DEFAULT 100)
RETURNS TABLE (
  record_id    TEXT,
  staff_id     TEXT,
  employee_id  TEXT,
  staff_name   TEXT,
  start_time   TIMESTAMPTZ,
  end_time     TIMESTAMPTZ,
  diff_seconds INT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    tt."id"::TEXT,
    tt."StaffId"::TEXT,
    s."EmployeeId",
    CONCAT(s."FirstName", ' ', s."Surname"),
    tt."StartTime",
    tt."EndTime",
    EXTRACT(EPOCH FROM (tt."EndTime" - tt."StartTime"))::INT
  FROM "TimeTracking" tt
  JOIN "Staff" s ON s."id" = tt."StaffId"
  WHERE tt."EndTime"   IS NOT NULL
    AND tt."EndTime"   < tt."StartTime"
    AND tt."IsDeleted" = false
  ORDER BY tt."StartTime" DESC
  LIMIT p_limit;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- IC-05: tt_open_logout_row
-- Rule: isLogoutStatus=true rows must always have endTime set
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_ic_tt_open_logout_row_count()
RETURNS BIGINT LANGUAGE SQL STABLE AS $$
  SELECT COUNT(*)::BIGINT
  FROM "TimeTracking" tt
  JOIN "StatusDefinition" sd ON sd."id" = tt."StatusId"
  WHERE sd."IsLogoutStatus" = true
    AND tt."EndTime"        IS NULL
    AND tt."IsDeleted"      = false;
$$;

CREATE OR REPLACE FUNCTION fn_ic_tt_open_logout_row_detail(p_limit INT DEFAULT 100)
RETURNS TABLE (
  record_id   TEXT,
  staff_id    TEXT,
  employee_id TEXT,
  staff_name  TEXT,
  start_time  TIMESTAMPTZ,
  status_name TEXT,
  notes       TEXT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    tt."id"::TEXT,
    tt."StaffId"::TEXT,
    s."EmployeeId",
    CONCAT(s."FirstName", ' ', s."Surname"),
    tt."StartTime",
    COALESCE(sd."DisplayName", sd."Name"),
    tt."Notes"
  FROM "TimeTracking" tt
  JOIN "Staff" s             ON s."id"  = tt."StaffId"
  JOIN "StatusDefinition" sd ON sd."id" = tt."StatusId"
  WHERE sd."IsLogoutStatus" = true
    AND tt."EndTime"        IS NULL
    AND tt."IsDeleted"      = false
  ORDER BY tt."StartTime" DESC
  LIMIT p_limit;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- IC-06: tt_stale_open_session
-- Rule (warning): non-superseded open session > 36h likely missed logout
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_ic_tt_stale_open_session_count()
RETURNS BIGINT LANGUAGE SQL STABLE AS $$
  SELECT COUNT(*)::BIGINT
  FROM "TimeTracking"
  WHERE "IsSuperseded" = false
    AND "EndTime"      IS NULL
    AND "IsDeleted"    = false
    AND "StartTime"    < NOW() - INTERVAL '36 hours';
$$;

CREATE OR REPLACE FUNCTION fn_ic_tt_stale_open_session_detail(p_limit INT DEFAULT 100)
RETURNS TABLE (
  record_id   TEXT,
  staff_id    TEXT,
  employee_id TEXT,
  staff_name  TEXT,
  start_time  TIMESTAMPTZ,
  hours_open  INT,
  notes       TEXT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    tt."id"::TEXT,
    tt."StaffId"::TEXT,
    s."EmployeeId",
    CONCAT(s."FirstName", ' ', s."Surname"),
    tt."StartTime",
    EXTRACT(EPOCH FROM (NOW() - tt."StartTime"))::INT / 3600,
    tt."Notes"
  FROM "TimeTracking" tt
  JOIN "Staff" s ON s."id" = tt."StaffId"
  WHERE tt."IsSuperseded" = false
    AND tt."EndTime"      IS NULL
    AND tt."IsDeleted"    = false
    AND tt."StartTime"    < NOW() - INTERVAL '36 hours'
  ORDER BY tt."StartTime" ASC
  LIMIT p_limit;
$$;
