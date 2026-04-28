-- AlterTable: add Auth2FARequired column to UserLogin
ALTER TABLE "UserLogin" ADD COLUMN "Auth2FARequired" BOOLEAN NOT NULL DEFAULT FALSE;
