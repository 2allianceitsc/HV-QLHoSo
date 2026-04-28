-- BA Gap Fixes: align schema with REQUIREMENTS.md

-- ── UserLogin: add auth2FAEnabled ─────────────────────────────────────────────
ALTER TABLE "UserLogin" ADD COLUMN "Auth2FAEnabled" BOOLEAN NOT NULL DEFAULT false;

-- ── Staff: add 14 personal/emergency fields ───────────────────────────────────
ALTER TABLE "Staff"
  ADD COLUMN "PresentAddress"          TEXT,
  ADD COLUMN "PermanentAddress"        TEXT,
  ADD COLUMN "PersonalEmailAddress"    VARCHAR(500),
  ADD COLUMN "CityOfBirth"             VARCHAR(200),
  ADD COLUMN "CountryOfBirth"          VARCHAR(100),
  ADD COLUMN "MaritalStatus"           SMALLINT,
  ADD COLUMN "FirstNameOfSpouse"       VARCHAR(200),
  ADD COLUMN "MiddleNameOfSpouse"      VARCHAR(200),
  ADD COLUMN "SurnameOfSpouse"         VARCHAR(200),
  ADD COLUMN "NumberOfChildren"        SMALLINT,
  ADD COLUMN "EmergencyContactFullName" VARCHAR(500),
  ADD COLUMN "RelationshipToYou"       VARCHAR(200),
  ADD COLUMN "EmergencyContactAreaCode" VARCHAR(10),
  ADD COLUMN "EmergencyContactNumber"  VARCHAR(50);

-- ── MoodLog: add VIBEIconText ─────────────────────────────────────────────────
ALTER TABLE "MoodLog" ADD COLUMN "VIBEIconText" VARCHAR(500);

-- ── StatusDefinition: add Description ────────────────────────────────────────
ALTER TABLE "StatusDefinition" ADD COLUMN "Description" TEXT;

-- ── CompanyContacts: restructure to BA spec ───────────────────────────────────
-- Table is empty (no controller/API existed), safe to drop and add columns.
ALTER TABLE "CompanyContacts"
  DROP COLUMN IF EXISTS "ContactName",
  DROP COLUMN IF EXISTS "Phone",
  DROP COLUMN IF EXISTS "Role",
  DROP COLUMN IF EXISTS "IsPrimary";

ALTER TABLE "CompanyContacts"
  ADD COLUMN "FirstName"            VARCHAR(200) NOT NULL DEFAULT '',
  ADD COLUMN "Surname"              VARCHAR(200) NOT NULL DEFAULT '',
  ADD COLUMN "EmailAddress"         VARCHAR(500),
  ADD COLUMN "MobileCountryCode"    VARCHAR(10),
  ADD COLUMN "MobileNumber"         VARCHAR(50),
  ADD COLUMN "LandlineCountryCode"  VARCHAR(10),
  ADD COLUMN "LandlineAreaCode"     VARCHAR(10),
  ADD COLUMN "LandlineNumber"       VARCHAR(50),
  ADD COLUMN "StreetAddress"        VARCHAR(500),
  ADD COLUMN "Suburb"               VARCHAR(200),
  ADD COLUMN "City"                 VARCHAR(200),
  ADD COLUMN "State"                VARCHAR(200),
  ADD COLUMN "Country"              VARCHAR(100),
  ADD COLUMN "Postcode"             VARCHAR(20);

-- Remove temporary defaults (columns are nullable-equivalent after this)
ALTER TABLE "CompanyContacts"
  ALTER COLUMN "FirstName" DROP DEFAULT,
  ALTER COLUMN "Surname" DROP DEFAULT;
