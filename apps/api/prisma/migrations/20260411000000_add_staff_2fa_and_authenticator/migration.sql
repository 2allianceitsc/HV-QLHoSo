-- AlterTable: Add 2FA fields to Staff
ALTER TABLE "Staff"
  ADD COLUMN "Is2FANeedEnable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "Is2FAEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: StaffAuthenticator
CREATE TABLE "StaffAuthenticator" (
    "id" TEXT NOT NULL,
    "StaffId" TEXT NOT NULL,
    "Code" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "IsEnable" BOOLEAN NOT NULL DEFAULT false,
    "Recipient" TEXT,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,
    CONSTRAINT "StaffAuthenticator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffAuthenticator_StaffId_Code_key" ON "StaffAuthenticator"("StaffId", "Code");

-- CreateIndex
CREATE INDEX "StaffAuthenticator_StaffId_IsDeleted_idx" ON "StaffAuthenticator"("StaffId", "IsDeleted");

-- AddForeignKey
ALTER TABLE "StaffAuthenticator"
  ADD CONSTRAINT "StaffAuthenticator_StaffId_fkey"
  FOREIGN KEY ("StaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
