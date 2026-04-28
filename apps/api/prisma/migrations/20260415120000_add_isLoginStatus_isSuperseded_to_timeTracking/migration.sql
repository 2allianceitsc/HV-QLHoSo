-- AlterTable: add multi-session tracking fields to TimeTracking
ALTER TABLE "TimeTracking"
  ADD COLUMN "IsLoginStatus" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "IsSuperseded"  BOOLEAN NOT NULL DEFAULT false;

-- Index: multi-session check (hasOpenLoginSession query)
CREATE INDEX "TimeTracking_StaffId_IsLoginStatus_EndTime_IsDeleted_idx"
  ON "TimeTracking" ("StaffId", "IsLoginStatus", "EndTime", "IsDeleted");
