-- ============================================================================
-- Global Login / Logout StatusDefinition consolidation
-- ============================================================================
-- Before: every company carried its own Login + Logout row → drift, missing
-- flags, sync burden, Alliance IT Service had IsWorkingInStatus = false.
-- After:  ONE global Login (CompanyId IS NULL) + ONE global Logout.
-- See: docs/flows/F04-global-login-logout.md
--
-- Idempotent: safe to re-run. Uses fixed UUIDv7 IDs for the two global rows
-- so repeated applies upsert rather than duplicate.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Upsert the two global status rows (CompanyId IS NULL).
--    Fixed IDs make the migration idempotent and re-referencable from seed.
-- ---------------------------------------------------------------------------
INSERT INTO "StatusDefinition" (
  id, "Name", "DisplayName", "ColorHex",
  "CompanyId", "OfficeId", "ClientId", "TeamId",
  "IsLoginStatus", "IsLogoutStatus",
  "IsWorkingInStatus", "IsWorkingOutStatus",
  "IsBreak", "IsAbsent", "IsIdleStatus",
  "IsNormalDayOff", "IsHalfDayOff", "IsPaid",
  "ScopeType", "OrderNo",
  "IsDeleted", "IsDisabled",
  "Log_CreatedAt", "Log_UpdatedAt", "Log_CreatedBy", "Log_UpdatedBy"
)
VALUES
  (
    '019dcb8a-0000-7001-a001-000000000001',
    'Login', 'Login', '#22C55E',
    NULL, NULL, NULL, NULL,
    true,  false,
    true,  false,
    false, false, false,
    false, false, true,
    'System', 0,
    false, false,
    NOW(), NOW(), 'migration:20260418120000', 'migration:20260418120000'
  ),
  (
    '019dcb8a-0000-7002-a002-000000000002',
    'Logout', 'Logout', '#6B7280',
    NULL, NULL, NULL, NULL,
    false, true,
    false, true,
    false, false, false,
    false, false, true,
    'System', 999,
    false, false,
    NOW(), NOW(), 'migration:20260418120000', 'migration:20260418120000'
  )
ON CONFLICT (id) DO UPDATE SET
  "Name"               = EXCLUDED."Name",
  "CompanyId"          = NULL,
  "IsLoginStatus"      = EXCLUDED."IsLoginStatus",
  "IsLogoutStatus"     = EXCLUDED."IsLogoutStatus",
  "IsWorkingInStatus"  = EXCLUDED."IsWorkingInStatus",
  "IsWorkingOutStatus" = EXCLUDED."IsWorkingOutStatus",
  "ScopeType"          = 'System',
  "IsDeleted"          = false,
  "IsDisabled"         = false,
  "Log_UpdatedAt"      = NOW(),
  "Log_UpdatedBy"      = 'migration:20260418120000';

-- ---------------------------------------------------------------------------
-- 2. Repoint every TimeTracking row that references an old per-company
--    Login/Logout status → global row. Skip rows already on the global row.
-- ---------------------------------------------------------------------------
UPDATE "TimeTracking" tt
SET "StatusId"      = '019dcb8a-0000-7001-a001-000000000001',
    "Log_UpdatedAt" = NOW(),
    "Log_UpdatedBy" = 'migration:20260418120000'
FROM "StatusDefinition" sd
WHERE tt."StatusId" = sd.id
  AND sd."IsLoginStatus" = true
  AND sd.id <> '019dcb8a-0000-7001-a001-000000000001';

UPDATE "TimeTracking" tt
SET "StatusId"      = '019dcb8a-0000-7002-a002-000000000002',
    "Log_UpdatedAt" = NOW(),
    "Log_UpdatedBy" = 'migration:20260418120000'
FROM "StatusDefinition" sd
WHERE tt."StatusId" = sd.id
  AND sd."IsLogoutStatus" = true
  AND sd.id <> '019dcb8a-0000-7002-a002-000000000002';

-- ---------------------------------------------------------------------------
-- 3. Soft-delete all per-company Login/Logout rows (now unreferenced).
--    CompanyId IS NOT NULL ensures we never touch the global rows.
-- ---------------------------------------------------------------------------
UPDATE "StatusDefinition"
SET "IsDeleted"     = true,
    "IsDisabled"    = true,
    "Log_UpdatedAt" = NOW(),
    "Log_UpdatedBy" = 'migration:20260418120000'
WHERE "CompanyId" IS NOT NULL
  AND "IsDeleted" = false
  AND ("IsLoginStatus" = true OR "IsLogoutStatus" = true);

-- ---------------------------------------------------------------------------
-- 4. Close dangling open Login rows.
--    Per staff, keep the single newest open (IsSuperseded=false, EndTime IS
--    NULL) Login row as the "current session"; close the rest with a marker
--    in Note so audit trail is preserved.
-- ---------------------------------------------------------------------------
WITH open_logins AS (
  SELECT tt.id,
         tt."StaffId",
         tt."Log_CreatedAt",
         ROW_NUMBER() OVER (
           PARTITION BY tt."StaffId"
           ORDER BY tt."Log_CreatedAt" DESC
         ) AS rn
  FROM "TimeTracking" tt
  WHERE tt."StatusId" = '019dcb8a-0000-7001-a001-000000000001'
    AND tt."EndTime" IS NULL
    AND tt."IsDeleted" = false
    AND tt."IsSuperseded" = false
)
UPDATE "TimeTracking" tt
SET "EndTime"       = tt."Log_CreatedAt" + INTERVAL '1 second',
    "Note"          = COALESCE(tt."Note", '') || ' [closed: migration cleanup 20260418]',
    "Log_UpdatedAt" = NOW(),
    "Log_UpdatedBy" = 'migration:20260418120000'
FROM open_logins ol
WHERE tt.id = ol.id
  AND ol.rn > 1;

COMMIT;
