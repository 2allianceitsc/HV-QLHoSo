-- DropIndex
DROP INDEX "TimeTracking_staffId_startTime_idx";

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "EnglishSurname" TEXT,
ADD COLUMN     "FavoriteCake" TEXT,
ADD COLUMN     "HDMFNumber" TEXT,
ADD COLUMN     "HomePhoneAreaCode" TEXT,
ADD COLUMN     "HomePhoneNumber" TEXT,
ADD COLUMN     "NominatedBankAccountName" TEXT,
ADD COLUMN     "NominatedBankAccountNumber" TEXT,
ADD COLUMN     "NominatedBankName" TEXT,
ADD COLUMN     "PhilHealthIdNumber" TEXT,
ADD COLUMN     "SSSNumber" TEXT;

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "Source" TEXT NOT NULL,
    "StatusCode" INTEGER,
    "Method" TEXT,
    "Url" TEXT,
    "Message" TEXT NOT NULL,
    "Stack" TEXT,
    "UserId" TEXT,
    "UserAgent" TEXT,
    "IpAddress" TEXT,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeTracking_StaffId_StartTime_idx" ON "TimeTracking"("StaffId", "StartTime");

-- RenameIndex
ALTER INDEX "TimeTracking_endTime_isDeleted_idx" RENAME TO "TimeTracking_EndTime_IsDeleted_idx";

-- RenameIndex
ALTER INDEX "TimeTracking_staffId_endTime_isDeleted_idx" RENAME TO "TimeTracking_StaffId_EndTime_IsDeleted_idx";
