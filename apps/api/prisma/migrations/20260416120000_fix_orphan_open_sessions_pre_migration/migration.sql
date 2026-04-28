-- ──────────────────────────────────────────────────────────────────────────────
-- Fix: mark pre-migration orphan open sessions as IsSuperseded = true
--
-- Context:
--   Migration 20260415120000 added IsLoginStatus + IsSuperseded columns with
--   DEFAULT false. Any rows that existed before that migration with EndTime IS NULL
--   inherited IsSuperseded=false, making them appear as "active sessions" to the
--   login flow. On next login the code correctly detected them as open sessions and
--   marked the new login row as IsSuperseded=true — producing false-positive
--   Superseded logins for real first-logins.
--
-- Fix:
--   All open rows created before the migration date are orphaned sessions that
--   predate multi-session tracking. Mark them IsSuperseded=true so the login flow
--   ignores them and treats the next login as a fresh session.
-- ──────────────────────────────────────────────────────────────────────────────

UPDATE "TimeTracking"
SET
  "IsSuperseded"  = true,
  "Log_UpdatedAt" = NOW(),
  "Log_UpdatedBy" = 'system-migration-fix-20260416'
WHERE "IsSuperseded" = false
  AND "EndTime"      IS NULL
  AND "IsDeleted"    = false
  AND "StartTime"    < '2026-04-15 00:00:00+00';
