-- Drop the redundant Staff.Email column.
-- Email is authoritative in UserLogin.Email (NOT NULL, UNIQUE).
-- BA confirmed 2026-04-24: Staff.Email is always null; field removed.
ALTER TABLE "Staff" DROP COLUMN IF EXISTS "Email";
