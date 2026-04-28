-- Add 2FA method to UserLogin
ALTER TABLE "UserLogin" ADD COLUMN "Auth2FAMethod" VARCHAR(20);

-- Create Auth2FASecret table
CREATE TABLE "Auth2FASecret" (
    "id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "Secret" TEXT NOT NULL,
    "BackupCodes" TEXT NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Log_UpdatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "Auth2FASecret_pkey" PRIMARY KEY ("id")
);

-- Create LoginOtp table
CREATE TABLE "LoginOtp" (
    "id" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "Otp" TEXT NOT NULL,
    "ExpiresAt" TIMESTAMPTZ NOT NULL,
    "IsUsed" BOOLEAN NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginOtp_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint on Auth2FASecret.UserId
CREATE UNIQUE INDEX "Auth2FASecret_UserId_key" ON "Auth2FASecret"("UserId");

-- Add index on LoginOtp for fast lookup
CREATE INDEX "LoginOtp_UserId_IsUsed_idx" ON "LoginOtp"("UserId", "IsUsed");

-- Add FK from Auth2FASecret to UserLogin
ALTER TABLE "Auth2FASecret" ADD CONSTRAINT "Auth2FASecret_UserId_fkey"
    FOREIGN KEY ("UserId") REFERENCES "UserLogin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
