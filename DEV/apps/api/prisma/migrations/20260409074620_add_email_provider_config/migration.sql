/*
  Warnings:

  - You are about to drop the column `Email` on the `CompanyContacts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CompanyContacts" DROP COLUMN "Email",
ALTER COLUMN "FirstName" SET DATA TYPE TEXT,
ALTER COLUMN "Surname" SET DATA TYPE TEXT,
ALTER COLUMN "EmailAddress" SET DATA TYPE TEXT,
ALTER COLUMN "MobileCountryCode" SET DATA TYPE TEXT,
ALTER COLUMN "MobileNumber" SET DATA TYPE TEXT,
ALTER COLUMN "LandlineCountryCode" SET DATA TYPE TEXT,
ALTER COLUMN "LandlineAreaCode" SET DATA TYPE TEXT,
ALTER COLUMN "LandlineNumber" SET DATA TYPE TEXT,
ALTER COLUMN "StreetAddress" SET DATA TYPE TEXT,
ALTER COLUMN "Suburb" SET DATA TYPE TEXT,
ALTER COLUMN "City" SET DATA TYPE TEXT,
ALTER COLUMN "State" SET DATA TYPE TEXT,
ALTER COLUMN "Country" SET DATA TYPE TEXT,
ALTER COLUMN "Postcode" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "MoodLog" ALTER COLUMN "VIBEIconText" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Staff" ALTER COLUMN "PhotoBirthday" SET DATA TYPE TEXT,
ALTER COLUMN "PersonalEmailAddress" SET DATA TYPE TEXT,
ALTER COLUMN "CityOfBirth" SET DATA TYPE TEXT,
ALTER COLUMN "CountryOfBirth" SET DATA TYPE TEXT,
ALTER COLUMN "MaritalStatus" SET DATA TYPE INTEGER,
ALTER COLUMN "FirstNameOfSpouse" SET DATA TYPE TEXT,
ALTER COLUMN "MiddleNameOfSpouse" SET DATA TYPE TEXT,
ALTER COLUMN "SurnameOfSpouse" SET DATA TYPE TEXT,
ALTER COLUMN "NumberOfChildren" SET DATA TYPE INTEGER,
ALTER COLUMN "EmergencyContactFullName" SET DATA TYPE TEXT,
ALTER COLUMN "RelationshipToYou" SET DATA TYPE TEXT,
ALTER COLUMN "EmergencyContactAreaCode" SET DATA TYPE TEXT,
ALTER COLUMN "EmergencyContactNumber" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "StatusDefinition" ALTER COLUMN "ScopeType" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "EmailProviderConfig" (
    "Id" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Provider" TEXT NOT NULL,
    "Config" TEXT NOT NULL,
    "FromName" TEXT NOT NULL DEFAULT 'VIBE365',
    "FromEmail" TEXT NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT false,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "EmailProviderConfig_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "EmailQueue" (
    "id" TEXT NOT NULL,
    "To" TEXT NOT NULL,
    "Subject" TEXT NOT NULL,
    "BodyHtml" TEXT NOT NULL,
    "Type" TEXT NOT NULL,
    "Status" TEXT NOT NULL DEFAULT 'pending',
    "RetryCount" INTEGER NOT NULL DEFAULT 0,
    "LastError" TEXT,
    "SentAt" TIMESTAMPTZ,
    "ScheduledAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "EmailQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpRateLimit" (
    "id" TEXT NOT NULL,
    "Email" TEXT NOT NULL,
    "DailyCount" INTEGER NOT NULL DEFAULT 0,
    "DailyDate" DATE NOT NULL,
    "LastRequestAt" TIMESTAMPTZ NOT NULL,
    "Note" TEXT,
    "IsDeleted" BOOLEAN NOT NULL DEFAULT false,
    "IsDisabled" BOOLEAN NOT NULL DEFAULT false,
    "OrderNo" INTEGER NOT NULL DEFAULT 0,
    "Log_CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_CreatedBy" TEXT,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    "Log_UpdatedBy" TEXT,

    CONSTRAINT "OtpRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailQueue_Status_IsDeleted_ScheduledAt_idx" ON "EmailQueue"("Status", "IsDeleted", "ScheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "OtpRateLimit_Email_key" ON "OtpRateLimit"("Email");
