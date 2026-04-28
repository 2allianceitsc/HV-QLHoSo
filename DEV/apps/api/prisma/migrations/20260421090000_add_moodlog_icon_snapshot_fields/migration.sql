-- Add snapshot columns to MoodLog so report data is independent of VIBEIcons config table
ALTER TABLE "MoodLog" ADD COLUMN IF NOT EXISTS "VIBEIconEmoji" TEXT;
ALTER TABLE "MoodLog" ADD COLUMN IF NOT EXISTS "VIBEIconUrl" TEXT;
