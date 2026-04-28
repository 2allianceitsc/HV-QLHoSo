-- Migration: replace full unique indexes on UserLogin.username and UserLogin.email
-- with partial unique indexes filtered by IsDeleted=false.
-- This allows soft-deleted records (IsDeleted=true) to be re-imported with the same credentials.

-- Drop full unique indexes created by @unique in the initial migration
DROP INDEX IF EXISTS "UserLogin_Username_key";
DROP INDEX IF EXISTS "UserLogin_Email_key";

-- Create partial unique indexes: only active (non-deleted) rows must be unique
CREATE UNIQUE INDEX "UserLogin_username_active_unique" ON "UserLogin" ("Username") WHERE "IsDeleted" = false;
CREATE UNIQUE INDEX "UserLogin_email_active_unique" ON "UserLogin" ("Email") WHERE "IsDeleted" = false;
