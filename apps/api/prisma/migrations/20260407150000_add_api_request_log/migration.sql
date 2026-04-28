-- Add ApiRequestLog table for tracking all API requests

CREATE TABLE "ApiRequestLog" (
  "id"           TEXT         NOT NULL,
  "Method"       TEXT         NOT NULL,
  "Url"          TEXT         NOT NULL,
  "StatusCode"   INTEGER      NOT NULL,
  "DurationMs"   INTEGER      NOT NULL,
  "UserId"       TEXT,
  "UserName"     TEXT,
  "IpAddress"    TEXT,
  "UserAgent"    TEXT,
  "RequestBody"  TEXT,
  "QueryParams"  TEXT,
  "CreatedAt"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT "ApiRequestLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApiRequestLog_CreatedAt_idx"      ON "ApiRequestLog"("CreatedAt" DESC);
CREATE INDEX "ApiRequestLog_UserId_CreatedAt_idx" ON "ApiRequestLog"("UserId", "CreatedAt" DESC);
CREATE INDEX "ApiRequestLog_Url_Method_idx"     ON "ApiRequestLog"("Url", "Method");
