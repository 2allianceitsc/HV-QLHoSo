-- CreateTable
CREATE TABLE "PasswordResetOtp" (
    "id" TEXT NOT NULL,
    "Email" TEXT NOT NULL,
    "Otp" TEXT NOT NULL,
    "ExpiresAt" TIMESTAMPTZ NOT NULL,
    "IsUsed" BOOLEAN NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshTokenBlacklist" (
    "Jti" TEXT NOT NULL,
    "ExpiresAt" TIMESTAMPTZ NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshTokenBlacklist_pkey" PRIMARY KEY ("Jti")
);
