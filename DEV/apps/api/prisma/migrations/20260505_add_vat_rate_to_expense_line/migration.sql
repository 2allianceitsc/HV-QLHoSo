-- Add VatRate column to ExpenseLine
ALTER TABLE "ExpenseLine" ADD COLUMN "VatRate" SMALLINT NOT NULL DEFAULT 10;
