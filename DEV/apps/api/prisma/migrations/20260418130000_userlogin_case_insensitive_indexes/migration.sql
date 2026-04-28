-- Migration: replace case-sensitive partial unique indexes on UserLogin.username and UserLogin.email
-- with case-insensitive functional indexes using LOWER().
-- BA rule: "stored as-is, lookup dùng LOWER(); unique constraint áp dụng case-insensitive"
-- Ref: BA/data-dictionary/ENTITIES-CORE.md, BA/changes/log-changes.md

-- Drop existing case-sensitive partial unique indexes
DROP INDEX IF EXISTS "UserLogin_username_active_unique";
DROP INDEX IF EXISTS "UserLogin_email_active_unique";

-- Create case-insensitive functional partial unique indexes
-- These enforce uniqueness on LOWER(Username) / LOWER(Email) for non-deleted rows only.
-- Allows soft-deleted records to be re-imported with the same credentials.
CREATE UNIQUE INDEX "UserLogin_username_ci_active_unique" ON "UserLogin" (LOWER("Username")) WHERE "IsDeleted" = false;
CREATE UNIQUE INDEX "UserLogin_email_ci_active_unique" ON "UserLogin" (LOWER("Email")) WHERE "IsDeleted" = false;
