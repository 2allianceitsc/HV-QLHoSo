-- Add client-reported UTC timestamps to TimeTracking for clock-skew observability.
-- ClientStartTime: browser's Date.now() at the moment the user pressed the status button.
-- ClientEndTime:   same value from the *next* status-change request that closes this row.
-- Both are nullable (older rows and auto-logout rows will have NULL).
ALTER TABLE "TimeTracking"
  ADD COLUMN "ClientStartTime" TIMESTAMPTZ,
  ADD COLUMN "ClientEndTime"   TIMESTAMPTZ;
