-- Add avatarKey to Staff (R2 object key for profile picture)
ALTER TABLE "Staff" ADD COLUMN "AvatarKey" VARCHAR(500);

-- Rename Attachment.Url → StorageKey (now stores R2 object key, not full URL)
ALTER TABLE "Attachment" RENAME COLUMN "Url" TO "StorageKey";
