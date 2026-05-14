-- Migration: hvRole String → hvRoles String[]
-- Each existing staff row's single role is carried over as a one-element array.

ALTER TABLE "Staff"
  ADD COLUMN "HvRoles" TEXT[] NOT NULL DEFAULT ARRAY['staff']::TEXT[];

UPDATE "Staff"
  SET "HvRoles" = ARRAY["HvRole"]::TEXT[];

ALTER TABLE "Staff"
  DROP COLUMN "HvRole";
