-- AlterTable: add global session revocation timestamp to UserLogin
-- Used by multi-session logout: when any device logs out, all tokens issued
-- before this timestamp are rejected by the JWT strategy.
ALTER TABLE "UserLogin"
  ADD COLUMN "AllSessionsRevokedAt" TIMESTAMPTZ;
