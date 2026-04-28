-- AlterTable
ALTER TABLE "Staff"
  ADD COLUMN "ShowFloatingWidget" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "FloatingWidgetPosition" JSONB DEFAULT '{"side":"right","yOffset":120}';
